require("dotenv").config();
const express = require("express");
const bodyParser = require("express").json();
const { Pool } = require("pg");
const KeycloakAdminClient = require("keycloak-admin").default;

const app = express();
app.use(bodyParser);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getKeycloakAdmin() {
  try {
    const kcAdminClient = new KeycloakAdminClient({ baseUrl: process.env.KEYCLOAK_BASE_URL });

    await kcAdminClient.auth({
      username: process.env.KEYCLOAK_USERNAME,
      password: process.env.KEYCLOAK_PASSWORD,
      grantType: "password",
      clientId: process.env.KEYCLOAK_CLIENT_ID,
    });

    kcAdminClient.setConfig({ realmName: process.env.KEYCLOAK_REALM });
    return kcAdminClient;
  } catch (error) {
    console.error("Keycloak authentication error:", error);
    throw new Error("Failed to authenticate with Keycloak");
  }
}

// Public: Search resources
app.get("/resources", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM resources");
    res.json(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Error retrieving resources" });
  }
});

// Authenticated: Publish a resource
app.post("/resources", async (req, res) => {
  try {
    const { name, description, provider, schema } = req.body;
    await pool.query(
      "INSERT INTO resources (name, description, provider, schema) VALUES ($1, $2, $3, $4)",
      [name, description, provider, JSON.stringify(schema)]
    );
    res.status(201).json({ message: "Resource published successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Error publishing resource" });
  }
});

// Public: Get resource details
app.get("/resources/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM resources WHERE id = $1", [id]);

    if (rows.length === 0) return res.status(404).json({ error: "Resource not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Error retrieving resource" });
  }
});

// Authenticated: Request access to a resource
app.post("/resources/:id/access-request", async (req, res) => {
  try {
    const { user } = req.body;
    const { id } = req.params;

    await pool.query(
      "INSERT INTO access_requests (resource_id, requester, status) VALUES ($1, $2, 'pending')",
      [id, user]
    );
    res.status(201).json({ message: "Access request submitted" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Error requesting access" });
  }
});

// Authenticated: Get access requests for a resource
app.get("/resources/:id/access-requests", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM access_requests WHERE resource_id = $1", [id]);
    res.json(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Error retrieving access requests" });
  }
});

// Authenticated: Approve/Deny access request
app.patch("/resources/:id/access-requests/:requestId", async (req, res) => {
  try {
    const { status } = req.body;
    const { requestId } = req.params;

    if (!["approved", "denied"].includes(status))
      return res.status(400).json({ error: "Invalid status" });

    await pool.query("UPDATE access_requests SET status = $1 WHERE id = $2", [status, requestId]);
    res.json({ message: `Access request ${status}` });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Error updating access request" });
  }
});

// Authenticated: Get resources by requester ID
app.get("/resources/requester/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { rows } = await pool.query(
        "SELECT r.* FROM resources r JOIN access_requests ar ON r.id = ar.resource_id WHERE ar.requester = $1",
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Error retrieving resources by requester" });
    }
  });
  

// Export `app` for testing
module.exports = app;

// Start the server only if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
