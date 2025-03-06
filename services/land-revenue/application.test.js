const request = require("supertest");
const { app, pool } = require("./apply");

describe("Benefit Application API Tests", () => {
  let createdApplicationId;

  // Test POST /applications without token returns 403.
  test("POST /applications without token returns 403 Forbidden", async () => {
    const res = await request(app)
      .post("/applications")
      .send({ name: "John Doe", caste: "SC", email: "john@example.com" });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  // Test POST /applications with invalid token returns 403.
  test("POST /applications with invalid token returns 403 Forbidden", async () => {
    const res = await request(app)
      .post("/applications")
      .set("Authorization", "Bearer invalid_token")
      .send({ name: "John Doe", caste: "SC", email: "john@example.com" });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  // Test POST /applications with valid token and eligible caste (SC) returns 201.
  test("POST /applications with valid token (eligible caste) returns 201", async () => {
    const res = await request(app)
      .post("/applications")
      .set("Authorization", "Bearer valid_token")
      .send({ name: "John Doe", caste: "SC", email: "john@example.com" });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Application created successfully");
    expect(res.body.application_id).toBeDefined();
    expect(res.body.application_data.eligible).toBe(true);
    createdApplicationId = res.body.application_id;
  });

  // Test POST /applications with valid token and non-eligible caste returns 201.
  test("POST /applications with valid token (non-eligible caste) returns 201", async () => {
    const res = await request(app)
      .post("/applications")
      .set("Authorization", "Bearer valid_token")
      .send({ name: "Jane Doe", caste: "General", email: "jane@example.com" });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Application created successfully");
    expect(res.body.application_data.eligible).toBe(false);
  });

  // Test GET /applications returns an array.
  test("GET /applications returns an array", async () => {
    const res = await request(app)
      .get("/applications")
      .set("Authorization", "Bearer valid_token");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Test GET /applications/:id returns the created application.
  test("GET /applications/:id returns the created application", async () => {
    const res = await request(app)
      .get(`/applications/${createdApplicationId}`)
      .set("Authorization", "Bearer valid_token");
    expect(res.statusCode).toBe(200);
    expect(res.body.application_id).toBe(createdApplicationId);
    expect(res.body.application_data.name).toBe("John Doe");
  });

  // Test GET /applications/:id returns 404 for non-existent id.
  test("GET /applications/:id returns 404 for non-existent id", async () => {
    const res = await request(app)
      .get("/applications/999999")
      .set("Authorization", "Bearer valid_token");
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Application not found");
  });

  // Test PUT /applications/:id updates status successfully.
  test("PUT /applications/:id updates status successfully", async () => {
    const res = await request(app)
      .put(`/applications/${createdApplicationId}`)
      .set("Authorization", "Bearer valid_token")
      .send({ status: "approved" });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Application updated successfully");
    expect(res.body.application.status).toBe("approved");
  });
});

// Clean up test data after running all tests.
afterAll(async () => {
    try {
      await pool.query("DELETE FROM applications");
    } catch (err) {
      console.error("Error cleaning up applications:", err.message);
    } finally {
      await pool.end();
    }
  });