const axios = require('axios');
require('dotenv').config();

const {
  KEYCLOAK_BASE_URL,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_REALM,
  CATALOGUE_API_URL,
  APPLICATION_API_URL,
  ID_MAPPING_API_URL
} = process.env;

if (!ID_MAPPING_API_URL) {
  console.error("ID_MAPPING_API_URL environment variable is not set!");
  process.exit(1);
}

const userCredentials = {
  username: "land-revenue",
  password: "1234",
  grant_type: "password",
  client_id: KEYCLOAK_CLIENT_ID,
};

// Authenticate with Keycloak and return the access token.
async function authenticateWithKeycloak() {
  try {
    const response = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams(userCredentials),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    console.log("Successfully authenticated with Keycloak.");
    return response.data.access_token;
  } catch (error) {
    console.error("Keycloak authentication failed:", error.response?.data || error.message);
    process.exit(1);
  }
}

// Submit a mapping request to the ID Mapping API.
async function submitMappingRequest(accessToken) {
  // Prepare the payload with the internal consumer ID and citizen details.
  const payload = {
    service_id: "electricity-456", // Internal Consumer ID (for example, Electricity Consumer Number)
    citizen_details: {
      name: "Jane Doe",
      phone_number: "9876543210",
      address: "456 Land Revenue Street",
      pin_code: "560002"
    },
    additional_proof: "optional-proof-data" // This can be omitted or provided as needed.
  };

  try {
    // Construct the full URL using the ID_MAPPING_API_URL environment variable.
    const url = `${ID_MAPPING_API_URL}/mapping`;
    console.log("Sending mapping request to URL:", url);
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    console.log("Mapping Request Created Successfully:");
    console.log(response.data);
  } catch (error) {
    console.error("Error creating mapping request:", error.response?.data || error.message);
  }
}

// Main function to perform the operation.
async function main() {
  const accessToken = await authenticateWithKeycloak();
  console.log("Keycloak Token:", accessToken);
  await submitMappingRequest(accessToken);
}

main();
