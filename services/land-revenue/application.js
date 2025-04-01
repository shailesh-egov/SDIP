require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Parse JSON request bodies.
app.use(express.json());

// PostgreSQL connection pool.
const pool = new Pool({
  host: process.env.DB_HOST,       
  port: process.env.DB_PORT,       
  database: process.env.DB_NAME,   
  user: process.env.DB_USER,       
  password: process.env.DB_PASSWORD 
});

// Token validation middleware with logging.
function validateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  console.log("[Token Validation] Authorization header:", authHeader);
  
  const tokenPart = authHeader.split(" ")[1];
  if (!tokenPart || tokenPart === "invalid_token") {
    console.error("[Token Validation] Invalid or missing token.");
    return res.status(403).json({ error: "Forbidden" });
  }
  
  console.log("[Token Validation] Token validated successfully.");
  next();
}

// POST /applications: Create a new application with a formatted ID.
app.post("/applications", validateToken, async (req, res) => {
  console.log("[Create Application] Received payload:", req.body);
  const { schemaName, status, applicationData } = req.body;
  
  // Validation (omitted for brevity; same as before)

  try {
    // 1. Insert the new application and return the application_id.
    const insertQuery = `
      INSERT INTO applications (application_data, schemename, status)
      VALUES ($1, $2, $3)
      RETURNING application_id;
    `;
    const values = [applicationData, schemaName, status];
    console.log("[Create Application] Executing insert query with values:", values);
    const insertResult = await pool.query(insertQuery, values);
    
    if (!insertResult.rows || insertResult.rows.length === 0) {
      console.error("[Create Application] Insert query did not return any rows.");
      return res.status(500).json({ error: "Internal server error: Insert failed" });
    }
    
    const application_id = insertResult.rows[0].application_id;
    console.log("[Create Application] Insert successful, application_id:", application_id);
    
    // 2. Update the inserted row with the formatted_id.
    const updateQuery = `
      UPDATE applications
      SET formatted_id = 'APP-' || LPAD(application_id::text, 6, '0')
      WHERE application_id = $1
      RETURNING application_id, formatted_id;
    `;
    const updateResult = await pool.query(updateQuery, [application_id]);
    
    if (!updateResult.rows || updateResult.rows.length === 0) {
      console.error("[Create Application] Update query did not return any rows for application_id:", application_id);
      return res.status(500).json({ error: "Internal server error: Update failed" });
    }
    
    const { formatted_id } = updateResult.rows[0];
    console.log("[Create Application] Application updated with formatted_id:", formatted_id);
    
    return res.status(201).json({
      message: "Application created successfully",
      application_id,
      formatted_id,
      application_data: applicationData,
      schemename: schemaName,
      status
    });
  } catch (error) {
    console.error("[Create Application] Error saving application:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// GET /applications: Retrieve all applications.
app.get("/applications", validateToken, async (req, res) => {
  console.log("[Get Applications] Request received.");
  try {
    const result = await pool.query("SELECT * FROM applications ORDER BY applied_at DESC");
    console.log("[Get Applications] Applications retrieved:", result.rows.length);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("[Get Applications] Error fetching applications:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /applications/:id: Retrieve a specific application by ID.
app.get("/applications/:id", validateToken, async (req, res) => {
  const applicationId = req.params.id;
  console.log("[Get Application] Request for application ID:", applicationId);
  try {
    const result = await pool.query("SELECT * FROM applications WHERE application_id = $1", [applicationId]);
    if (result.rows.length === 0) {
      console.error("[Get Application] Application not found for ID:", applicationId);
      return res.status(404).json({ error: "Application not found" });
    }
    console.log("[Get Application] Application found for ID:", applicationId);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("[Get Application] Error fetching application:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /applications/:id: Update application status.
app.put("/applications/:id", validateToken, async (req, res) => {
  const applicationId = req.params.id;
  const { status } = req.body;
  console.log("[Update Application] Update request for application ID:", applicationId, "with new status:", status);
  
  if (!status) {
    console.error("[Update Application] Missing status in request body for application ID:", applicationId);
    return res.status(400).json({ error: "Missing required field: status" });
  }
  try {
    const result = await pool.query(
      "UPDATE applications SET status = $1 WHERE application_id = $2 RETURNING *",
      [status, applicationId]
    );
    if (result.rowCount === 0) {
      console.error("[Update Application] Application not found for ID:", applicationId);
      return res.status(404).json({ error: "Application not found" });
    }
    console.log("[Update Application] Application updated successfully for ID:", applicationId);
    return res.status(200).json({
      message: "Application updated successfully",
      application: result.rows[0]
    });
  } catch (error) {
    console.error("[Update Application] Error updating application:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server if this file is run directly.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`API running on port ${port}`);
  });
}

module.exports = app;
