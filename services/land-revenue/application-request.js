require('dotenv').config();
const axios = require('axios');

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const APPLICATION_API_URL = process.env.APPLICATION_API_URL || 'http://localhost:3000';

const userCredentials = {
  username: "land-revenue",
  password: "1234",
  grant_type: "password",
  client_id: KEYCLOAK_CLIENT_ID,
};

// Authenticate with Keycloak
async function authenticateWithKeycloak() {
  try {
    const response = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams(userCredentials),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Keycloak authentication failed:", error.response?.data || error.message);
    process.exit(1);
  }
}

async function applyForCasteCertificate() {
  try {
    // Obtain token from Keycloak.
    const token = await authenticateWithKeycloak();
    console.log("Obtained token:", token);

    // Define the complete application details.
    const applicationData = {
      name: "John Doe",
      caste: "SC", // Eligible caste; change as needed.
      email: "john.doe@example.com",
      aadhar: "123412341234",            // Mandatory Aadhar number.
      schemaName: "Caste Certificate"    // Mandatory schema name.
    };

    console.log("Sending application data:", applicationData);

    // Make API call to apply for a caste certificate.
    const response = await axios.post(`${APPLICATION_API_URL}/applications`, applicationData, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    console.log("Application created successfully:");
    console.log(response.data);
  } catch (error) {
    console.error("Error applying for caste certificate:");
    if (error.response) {
      console.error("Status code:", error.response.status);
      console.error("Response data:", error.response.data);
    } else {
      console.error("Error message:", error.message);
    }
    console.error("Stack trace:", error.stack);
  }
}

applyForCasteCertificate();
