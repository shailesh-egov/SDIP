require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// PostgreSQL pool connection configuration using environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Optional: Keycloak configuration object for future use
const keycloakConfig = {
  baseUrl: process.env.KEYCLOAK_BASE_URL,
  realm: process.env.KEYCLOAK_REALM,
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  username: process.env.KEYCLOAK_USERNAME,
  password: process.env.KEYCLOAK_PASSWORD,
};

// Optional: Catalogue Service API URL
const catalogueServiceUrl = process.env.CATALOGUE_SERVICE_URL;

// POST /api/users: Create a new user in the id_mapping_user table
app.post('/api/users', async (req, res) => {
  const { name, referenceId, phoneNumber } = req.body;
  
  // Validate request payload
  if (!name || !referenceId) {
    return res.status(400).json({ error: 'Both name and referenceId are required.' });
  }

  try {
    // Insert the new user into the id_mapping_user table
    const result = await pool.query(
      'INSERT INTO id_mapping_user (name, reference_id, phone_number) VALUES ($1, $2, $3) RETURNING *',
      [name, referenceId, phoneNumber]
    );
    
    // Respond with the newly created user
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server on the port defined in the environment variables
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server is running on port ${PORT}`);
});
