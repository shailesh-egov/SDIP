require("dotenv").config();
const axios = require("axios");

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const CATALOGUE_SERVICE_URL = process.env.CATALOGUE_API_URL;

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

// Retrieve all resources owned by "land-revenue"
async function getLandRevenueResources(token) {
  try {
    const response = await axios.get(`${CATALOGUE_SERVICE_URL}/resources`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.filter((resource) => resource.provider === "Land Revenue Department");
  } catch (error) {
    console.error("Error retrieving land-revenue resources:", error.response?.data || error.message);
    process.exit(1);
  }
}

// Retrieve access requests for a specific resource
async function getAccessRequestsForResource(token, resourceId) {
  try {
    const response = await axios.get(
      `${CATALOGUE_SERVICE_URL}/resources/${resourceId}/access-requests`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data.filter((request) => request.status === "pending"); // Filter pending requests
  } catch (error) {
    console.error(`Error retrieving access requests for resource ${resourceId}:`, error.response?.data || error.message);
    return [];
  }
}

// Approve access requests for a specific resource
async function approveAccessRequests(token, resourceId, requests) {
  for (const request of requests) {
    try {
      await axios.patch(
        `${CATALOGUE_SERVICE_URL}/resources/${resourceId}/access-requests/${request.id}`,
        { status: "approved" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(`Approved access request ${request.id} for resource ${resourceId}`);
    } catch (error) {
      console.error(`Error approving request ${request.id}:`, error.response?.data || error.message);
    }
  }
}

// Main function
(async () => {
  const token = await authenticateWithKeycloak();
  const resources = await getLandRevenueResources(token);

  if (resources.length === 0) {
    console.log("No resources found for land-revenue.");
    return;
  }

  for (const resource of resources) {
    const accessRequests = await getAccessRequestsForResource(token, resource.id);

    if (accessRequests.length > 0) {
      await approveAccessRequests(token, resource.id, accessRequests);
    } else {
      console.log(`No pending requests for resource ${resource.id}`);
    }
  }
})();
