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
// Birth Certificate Schema Definition
// ------------------------------
const schemaDefinition = {
  name: "Birth Certificate",
  description: "Schema for birth certificate issuance",
  provider: "Registrar of Births Department",
  schema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Unique identifier for the certificate" },
      holderName: { type: "string", description: "Name of the certificate holder" },
      dateOfBirth: { type: "string", format: "date", description: "Date of birth" },
      placeOfBirth: { type: "string", description: "Place of birth" },
      gender: { type: "string", description: "Gender of the certificate holder" },
      issuedDate: { type: "string", format: "date", description: "Date of issuance" },
      issuingAuthority: { type: "string", description: "Authority issuing the certificate" },
      fatherName: { type: "string", description: "Name of the father" },
      motherName: { type: "string", description: "Name of the mother" }
    },
    required: ["id", "holderName", "dateOfBirth", "placeOfBirth", "issuedDate", "issuingAuthority"]
  }
};

// ------------------------------
// Function to generate birth certificate data
// ------------------------------
function generateBirthCertificateData() {
  // Generate a unique ID using a timestamp
  const id = `BIRTH-${Date.now()}`;
  const holderName = "John Doe";
  // Assume a 25-year-old applicant: date of birth 25 years ago from today.
  const dateOfBirth = new Date(new Date().setFullYear(new Date().getFullYear() - 25))
    .toISOString().split("T")[0];
  const placeOfBirth = "New York";
  const gender = "Male";
  const issuedDate = new Date().toISOString().split("T")[0];
  const issuingAuthority = schemaDefinition.provider;
  const fatherName = "John Doe Sr.";
  const motherName = "Jane Doe";

  return { id, holderName, dateOfBirth, placeOfBirth, gender, issuedDate, issuingAuthority, fatherName, motherName };
}

// ------------------------------
// Main function to add birth certificate via API with detailed logging
// ------------------------------
async function addBirthCertificate() {
  try {
    // Generate certificate data based on the birth certificate schema.
    const certificateData = generateBirthCertificateData();
    console.log("Generated Birth Certificate Data:", certificateData);

    // Build the payload expected by your API.
    // resource_id is set to the certificate's id,
    // department is "birth-registry",
    // and data contains the certificate details.
    const payload = {
      resource_id: certificateData.id,
      department: "birth-registry",
      data: certificateData
    };
    console.log("Payload to send:", payload);

    // Get Keycloak token.
    const token = await getKeycloakToken();
    console.log("Using token:", token);

    // Get the API URL from environment variables (or default to localhost:4000/certificate).
    const apiUrl = process.env.CERTIFICATE_API_URL || "http://localhost:4000/certificate";
    console.log("Sending POST request to:", apiUrl);

    // Post the certificate data to the certificate API.
    const response = await axios.post(apiUrl, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Birth Certificate added successfully:", response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error adding birth certificate - Response Data:", error.response.data);
      console.error("Error adding birth certificate - Status:", error.response.status);
    } else {
      console.error("Error adding birth certificate:", error.message);
    }
    console.error(error.stack);
  }
}

addBirthCertificate();
