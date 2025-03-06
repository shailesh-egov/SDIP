require("dotenv").config();
const axios = require("axios");
const KeycloakAdminClient = require("keycloak-admin").default;

async function getKeycloakToken() {
  const kcAdminClient = new KeycloakAdminClient({ baseUrl: process.env.KEYCLOAK_BASE_URL, realmName: "SDIP" });

  await kcAdminClient.auth({
    username: "land-revenue",
    password: "1234",
    grantType: "password",
    clientId: process.env.KEYCLOAK_CLIENT_ID,
  });

  return kcAdminClient.accessToken;
}

async function publishCasteCertificateSchema(token) {
  const schema = {
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

  try {
    const response = await axios.post(process.env.CATALOGUE_API_URL+"/resources", schema, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    console.log("Schema published successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error publishing schema:", error.response?.data || error.message);
    throw error;
  }
}

async function getInsertedResource(token, resourceId) {
  try {
    const response = await axios.get(`${process.env.CATALOGUE_API_URL}/${resourceId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Retrieved Resource:", response.data);
  } catch (error) {
    console.error("Error retrieving resource:", error.response?.data || error.message);
  }
}

(async () => {
  try {
    const token = await getKeycloakToken();
    const publishedResource = await publishCasteCertificateSchema(token);
    
    if (publishedResource && publishedResource.id) {
      await getInsertedResource(token, publishedResource.id);
    } else {
      console.error("Resource ID not found in response.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
})();
