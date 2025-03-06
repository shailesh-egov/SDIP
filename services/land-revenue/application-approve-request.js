require('dotenv').config();
const axios = require('axios');

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const APPROVAL_API_URL = process.env.APPROVAL_API_URL || 'http://localhost:4000/applications';

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

async function approveApplications() {
  try {
    const token = await authenticateWithKeycloak();
    console.log("Obtained token:", token);

    // Fetch all pending applications
    const getResponse = await axios.get(APPROVAL_API_URL, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const applications = getResponse.data;
    if (!applications.length) {
      console.log("No pending applications found.");
      return;
    }

    console.log(`Found ${applications.length} pending application(s).`);

    // Approve each application by calling the approval endpoint.
    for (const appData of applications) {
      const appId = appData.application_id;
      const approvalUrl = `${APPROVAL_API_URL}/${appId}/approve`;

      try {
        const putResponse = await axios.put(approvalUrl, {}, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        console.log(`Application ${appId} approved:`, putResponse.data);
      } catch (error) {
        console.error(`Error approving application ${appId}:`, error.response ? error.response.data : error.message);
      }
    }
  } catch (error) {
    console.error("Error fetching applications:", error.response ? error.response.data : error.message);
  }
}

approveApplications();