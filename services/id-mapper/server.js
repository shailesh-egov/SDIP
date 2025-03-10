const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

// PostgreSQL pool configuration using environment variables
const pool = new Pool({
  host: process.env.DB_HOST,       // e.g., "localhost"
  port: process.env.DB_PORT,       // e.g., 5432
  database: process.env.DB_NAME,   // e.g., "postgres"
  user: process.env.DB_USER,       // e.g., "postgres"
  password: process.env.DB_PASSWORD // e.g., "postgres"
});

// Token validation middleware using a simple check
function validateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const tokenPart = authHeader.split(" ")[1];
  if (!tokenPart || tokenPart === "invalid_token") {
    console.error("Token validation failed. Received token:", tokenPart);
    return res.status(403).json({ error: "Forbidden" });
  }
  console.log("Token validated successfully.");
  next();
}

/**
 * POST /mapping
 * For line departments or service providers to submit a mapping request.
 */
app.post('/mapping', validateToken, async (req, res) => {
  console.log("Received /mapping request with body:", req.body);
  const { service_id, citizen_details, additional_proof } = req.body;
  if (!service_id || !citizen_details) {
    console.error("Missing required fields in /mapping request.");
    return res.status(400).json({ error: 'service_id and citizen_details are required.' });
  }
  const mapping_request_id = uuidv4();
  const status = "pending";
  const insertQuery = `
    INSERT INTO mapping_requests (id, service_id, citizen_details, additional_proof, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id AS mapping_request_id, status;
  `;
  const values = [mapping_request_id, service_id, citizen_details, additional_proof || null, status];
  
  try {
    console.log("Executing query to insert mapping request.");
    const result = await pool.query(insertQuery, values);
    console.log("Mapping request inserted:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting mapping request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /verification
 * Certificate-issuing departments call this endpoint with a service_id.
 */
app.post('/verification', validateToken, async (req, res) => {
  console.log("Received /verification request with body:", req.body);
  const { service_id, mapping_request_id, aadhaar_id } = req.body;
  if (!service_id) {
    console.error("Missing service_id in /verification request.");
    return res.status(400).json({ error: 'service_id is required.' });
  }
  try {
    // Retrieve the mapping record by service_id.
    const query = `SELECT * FROM mapping_requests WHERE service_id = $1`;
    console.log("Executing query:", query, "with service_id:", service_id);
    const result = await pool.query(query, [service_id]);
    if (result.rows.length === 0) {
      console.error("Mapping request not found for service_id:", service_id);
      return res.status(404).json({ error: 'Mapping request not found.' });
    }
    const mappingRequest = result.rows[0];
    console.log("Retrieved mapping request:", mappingRequest);
    
    // If already verified, return the verification details.
    if (mappingRequest.status === 'mapped' && mappingRequest.aadhaar_id) {
      console.log("Mapping already verified. Retrieving linked service IDs.");
      const linkedQuery = `SELECT service_id FROM mapping_requests WHERE aadhaar_id = $1`;
      const linkedResult = await pool.query(linkedQuery, [mappingRequest.aadhaar_id]);
      const linked_service_ids = linkedResult.rows.map(row => row.service_id);
      console.log("Linked service IDs:", linked_service_ids);
      return res.json({
        aadhaar_id: mappingRequest.aadhaar_id,
        linked_service_ids
      });
    }
    
    // If mapping is pending, check if verification parameters are provided.
    if (mapping_request_id && aadhaar_id) {
      if (mappingRequest.id !== mapping_request_id) {
        console.error("Provided mapping_request_id does not match record. Provided:", mapping_request_id, "Expected:", mappingRequest.id);
        return res.status(400).json({ error: 'Invalid mapping request id.' });
      }
      console.log("Updating pending mapping with Aadhaar:", aadhaar_id);
      const updateQuery = `
        UPDATE mapping_requests
        SET aadhaar_id = $1, status = 'mapped'
        WHERE id = $2
        RETURNING id AS mapping_request_id, status, aadhaar_id;
      `;
      await pool.query(updateQuery, [aadhaar_id, mapping_request_id]);
      console.log("Mapping updated successfully. Retrieving linked service IDs.");
      const linkedQuery = `SELECT service_id FROM mapping_requests WHERE aadhaar_id = $1`;
      const linkedResult = await pool.query(linkedQuery, [aadhaar_id]);
      const linked_service_ids = linkedResult.rows.map(row => row.service_id);
      console.log("Linked service IDs:", linked_service_ids);
      return res.json({
        aadhaar_id,
        linked_service_ids
      });
    } else {
      console.error("Mapping pending and no verification parameters provided.");
      return res.status(404).json({ error: 'Mapping is still pending and no verification parameters provided.' });
    }
  } catch (error) {
    console.error("Error during verification:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /dispute
 * Allows citizens to raise a dispute if a service ID is incorrectly mapped.
 */
app.post('/dispute', validateToken, async (req, res) => {
  console.log("Received /dispute request with body:", req.body);
  const { service_id, aadhaar_id, reason, supporting_documents } = req.body;
  if (!service_id || !aadhaar_id || !reason) {
    console.error("Missing required fields in /dispute request.");
    return res.status(400).json({ error: 'service_id, aadhaar_id, and reason are required.' });
  }
  const dispute_id = uuidv4();
  const status = "pending";
  const insertQuery = `
    INSERT INTO disputes (dispute_id, service_id, aadhaar_id, reason, supporting_documents, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING dispute_id, status;
  `;
  const values = [dispute_id, service_id, aadhaar_id, reason, JSON.stringify(supporting_documents || []), status];
  try {
    console.log("Executing query to insert dispute.");
    const result = await pool.query(insertQuery, values);
    console.log("Dispute inserted:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting dispute:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server on the port defined in environment variables (or default to 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ID Mapping & Verification Service API is running on port ${PORT}`);
});

module.exports = app;
