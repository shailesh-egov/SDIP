require("dotenv").config();
const axios = require("axios");
const KeycloakAdminClient = require("keycloak-admin").default;

// ------------------------------
// Get Keycloak token function with logs
// ------------------------------
async function getKeycloakToken() {
  try {
    console.log("Attempting to get Keycloak token...");
    const kcAdminClient = new KeycloakAdminClient({ 
      baseUrl: process.env.KEYCLOAK_BASE_URL, 
      realmName: "SDIP" 
    });

    await kcAdminClient.auth({
      username: "land-revenue",
      password: "1234",
      grantType: "password",
      clientId: process.env.KEYCLOAK_CLIENT_ID,
    });

    console.log("Successfully retrieved Keycloak token.");
    return kcAdminClient.accessToken;
  } catch (error) {
    console.error("Error in getKeycloakToken:", error.message);
    throw error;
  }
}

// ------------------------------
// Certificate Schema Definition
// ------------------------------
const schemaDefinition = {
  name: "Caste Certificate",
  description: "Schema for caste certificate issuance",
  provider: "Land Revenue Department",
  schema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Unique identifier for the certificate" },
      holderName: { type: "string", description: "Name of the certificate holder" },
      caste: { type: "string", description: "Caste of the certificate holder" },
      issuedDate: { type: "string", format: "date", description: "Date of issuance" },
      validTill: { type: "string", format: "date", description: "Validity date" },
      issuingAuthority: { type: "string", description: "Authority issuing the certificate" }
    },
    required: ["id", "holderName", "caste", "issuedDate", "issuingAuthority"]
  }
};

// ------------------------------
// Function to generate certificate data
// ------------------------------
function generateCertificateData() {
  // Generate a unique certificate ID (e.g., using timestamp)
  const id = `CERT-${Date.now()}`;
  const holderName = "John Doe";
  const caste = "General";
  // Today's date in YYYY-MM-DD format
  const issuedDate = new Date().toISOString().split("T")[0];
  // Validity: one year from now
  const validTill = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    .toISOString()
    .split("T")[0];
  const issuingAuthority = schemaDefinition.provider; // "Land Revenue Department"

  return { id, holderName, caste, issuedDate, validTill, issuingAuthority };
}

// ------------------------------
// Main function to add certificate via API with detailed logging
// ------------------------------
async function addCertificate() {
  try {
    // Generate certificate data based on the schema
    const certificateData = generateCertificateData();
    console.log("Generated Certificate Data:", certificateData);

    // Build the payload expected by your API.
    // resource_id is set to the certificate's id,
    // department is "land-revenue",
    // and data contains the certificate details.
    const payload = {
      resource_id: certificateData.id,
      department: "land-revenue",
      data: certificateData
    };
    console.log("Payload to send:", payload);

    // Get Keycloak token
    const token = await getKeycloakToken();
    console.log("Using token:", token);

    // Get the API URL from environment variables (or default to localhost:4000)
    const apiUrl = process.env.CERTIFICATE_API_URL || "http://localhost:4000/certificate";
    console.log("Sending POST request to:", apiUrl);

    // Post the certificate data to the certificate API
    const response = await axios.post(apiUrl, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Certificate added successfully:", response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error adding certificate - Response Data:", error.response.data);
      console.error("Error adding certificate - Status:", error.response.status);
    } else {
      console.error("Error adding certificate:", error.message);
    }
    console.error(error.stack);
  }
}

addCertificate();
