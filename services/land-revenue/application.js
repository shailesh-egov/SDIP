require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Parse JSON request bodies.
app.use(express.json());

// Keycloak authentication validation middleware.
function validateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const tokenPart = authHeader.split(" ")[1];
  if (!tokenPart || tokenPart === "invalid_token") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Create a PostgreSQL connection pool.
const pool = new Pool({
  host: process.env.DB_HOST,       
  port: process.env.DB_PORT,       
  database: process.env.DB_NAME,   
  user: process.env.DB_USER,       
  password: process.env.DB_PASSWORD 
});

// POST /applications: Create a new application.
app.post("/applications", validateToken, async (req, res) => {
  const { name, caste, email, aadhar, schemaName } = req.body;

  // Validate required fields.
  if (!name || !caste || !email || !aadhar || !schemaName) {
    return res.status(400).json({ 
      error: "Missing required fields: name, caste, email, aadhar, schemaName" 
    });
  }

  // Determine eligibility: Only SC, ST, or OBC are eligible.
  let eligible = false;
  let message = "";
  if (["SC", "ST", "OBC"].includes(caste.trim().toUpperCase())) {
    eligible = true;
    message = "Congratulations! You are eligible for the benefit.";
  } else {
    message = "This benefit is only available for reserved categories (SC, ST, OBC).";
  }

  // Build the application object to store in JSONB.
  const applicationData = { name, caste, email, aadhar, eligible, message };
  const status = "pending"; // Default status.

  try {
    const insertQuery = `
      INSERT INTO applications (application_data, schemename, status)
      VALUES ($1, $2, $3)
      RETURNING application_id;
    `;
    const values = [applicationData, schemaName, status];
    const result = await pool.query(insertQuery, values);
    const applicationId = result.rows[0].application_id;
    return res.status(201).json({
      message: "Application created successfully",
      application_id: applicationId,
      application_data: applicationData,
      schemename: schemaName,
      status: status,
    });
  } catch (error) {
    console.error("Error saving application:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /applications: Retrieve all applications.
app.get("/applications", validateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM applications ORDER BY applied_at DESC");
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching applications:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /applications/:id: Retrieve a specific application.
app.get("/applications/:id", validateToken, async (req, res) => {
  const applicationId = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM applications WHERE application_id = $1", [applicationId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching application:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /applications/:id: Update application status.
app.put("/applications/:id", validateToken, async (req, res) => {
  const applicationId = req.params.id;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Missing required field: status" });
  }
  try {
    const result = await pool.query(
      "UPDATE applications SET status = $1 WHERE application_id = $2 RETURNING *",
      [status, applicationId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    return res.status(200).json({ message: "Application updated successfully", application: result.rows[0] });
  } catch (error) {
    console.error("Error updating application:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server if run directly.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`API running on port ${port}`);
  });
}

module.exports = { app, pool };
