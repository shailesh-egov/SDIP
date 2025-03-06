require("dotenv").config();
const request = require("supertest");
const { Pool } = require("pg");
const app = require("./server");

// Same DB config as in server.js
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

let authToken;
let certificateId;

/**
 * If you have a real Keycloak server, fetch a real token here.
 * Otherwise, we just pretend "valid_token" is your legitimate token.
 */
async function authenticate() {
  // Return a token that won't trigger the 403 in validateToken
  return "valid_token";
}

// Clear the table before tests
beforeAll(async () => {
  authToken = await authenticate();
  try {
    await pool.query("DELETE FROM certificates;");
  } catch (error) {
    console.error("Database cleanup error:", error);
  }
});

// Close DB pool after all tests
afterAll(async () => {
  await pool.end();
});

describe("🔹 Certificate Service API Tests", () => {
  test("✅ 1. Publish a certificate", async () => {
    const res = await request(app)
      .post("/certificate")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        resource_id: "12345",
        department: "land-revenue",
        data: { name: "John Doe", certificateType: "Caste Certificate" },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    certificateId = res.body.id;
  });

  test("🚫 2. Retrieve a certificate (Unauthorized access)", async () => {
    const res = await request(app)
      .get(`/certificate/${certificateId}`)
      .set("Authorization", "Bearer invalid_token"); // triggers 403

    expect(res.statusCode).toBe(403);
  });

  test("✅ 3. Retrieve a certificate (Authorized access)", async () => {
    const res = await request(app)
      .get(`/certificate/${certificateId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data.name).toBe("John Doe");
    expect(res.body.data.certificateType).toBe("Caste Certificate");
  });

  test("✅ 4. Fetch All Certificates (Department Level)", async () => {
    const res = await request(app)
      .get("/certificate")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // We should have at least 1 certificate (the one created above)
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("✅ 5. Delete a certificate", async () => {
    const res = await request(app)
      .delete(`/certificate/${certificateId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.statusCode).toBe(204);
  });

  test("🚫 6. Retrieve a deleted certificate (Not Found)", async () => {
    const res = await request(app)
      .get(`/certificate/${certificateId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.statusCode).toBe(404);
  });
});
