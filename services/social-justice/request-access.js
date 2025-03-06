require("dotenv").config();
const axios = require("axios");

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const CATALOGUE_SERVICE_URL = process.env.CATALOGUE_SERVICE_URL;

const userCredentials = {
  username: "social-justice",
  password: "1234",
  grant_type: "password",
  client_id: KEYCLOAK_CLIENT_ID,
};

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

async function searchCatalogue(token) {
  try {
    const response = await axios.get(`${CATALOGUE_SERVICE_URL}/resources`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const casteCertificate = response.data.find((item) => item.name === "Caste Certificate");
    if (!casteCertificate) {
      console.log("Caste Certificate not found in catalogue.");
      process.exit(1);
    }

    return casteCertificate.id;
  } catch (error) {
    console.error("Error searching catalogue:", error.response?.data || error.message);
    process.exit(1);
  }
}

async function requestAccess(token, resourceId) {
  try {
    const response = await axios.post(
      `${CATALOGUE_SERVICE_URL}/resources/${resourceId}/access-request`,
      { user: "social-justice" },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data.id; // Assuming the response contains an `id` for the access request
  } catch (error) {
    console.error("Error requesting access:", error.response?.data || error.message);
    process.exit(1);
  }
}

(async () => {
  const token = await authenticateWithKeycloak();
  const resourceId = await searchCatalogue(token);
  const accessRequestId = await requestAccess(token, resourceId);

  console.log(`Access Request ID: ${accessRequestId}`);
})();
