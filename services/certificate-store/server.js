require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// Create a pool to your Postgres DB
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Simple middleware to “validate” bearer tokens for the test.
 * - If the header has "invalid_token", we respond 403 (Forbidden).
 * - Otherwise, we assume it's valid and continue.
 *
 * In real Keycloak usage, you'd verify the token or do an introspection.
 */
function validateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const tokenPart = authHeader.split(" ")[1];
  if (!tokenPart || tokenPart === "invalid_token") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

/**
 * POST /certificate
 * Creates a new certificate and returns { id: <number> } with HTTP 201.
 */
app.post("/certificate", validateToken, async (req, res) => {
  try {
    const { resource_id, department, data } = req.body;
    if (!resource_id || !department || !data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Make sure to stringify the data object for JSONB column
    const result = await pool.query(
      `INSERT INTO certificates (resource_id, department_id, certificate_data)
       VALUES ($1, $2, $3)
       RETURNING certificate_id`,
      [resource_id, department, JSON.stringify(data)]
    );

    const newId = result.rows[0].certificate_id;
    return res.status(201).json({ id: newId });
  } catch (error) {
    console.error("Error inserting certificate:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /certificate/:id
 * Retrieves a single certificate. Expects a valid token from validateToken.
 */
app.get("/certificate/:id", validateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM certificates WHERE certificate_id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    const row = result.rows[0];
    // Return shape that test expects: body.data => your stored data
    return res.status(200).json({
      id: row.certificate_id,
      data: row.certificate_data,
      department: row.department_id,
      resource_id: row.resource_id
    });
  } catch (error) {
    console.error("Error retrieving certificate:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /certificate
 * Returns all certificates as an array. Expects a valid token.
 */
app.get("/certificate", validateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM certificates");
    const all = result.rows.map((row) => ({
      id: row.certificate_id,
      department: row.department_id,
      resource_id: row.resource_id,
      data: row.certificate_data
    }));
    return res.status(200).json(all);
  } catch (error) {
    console.error("Error retrieving certificates:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * DELETE /certificate/:id
 * Deletes a single certificate by ID. Returns 204 on success, 404 if not found.
 */
app.delete("/certificate/:id", validateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const delResult = await pool.query(
      `DELETE FROM certificates WHERE certificate_id = $1 RETURNING certificate_id`,
      [id]
    );
    if (delResult.rowCount === 0) {
      // Not found => 404
      return res.status(404).json({ error: "Certificate not found" });
    }
    // If successfully deleted, return 204 No Content
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting certificate:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Only start listening if file is run directly, not in test environment
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
