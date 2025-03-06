require("dotenv").config();
const request = require("supertest");
const { Pool } = require("pg");
const app = require("./server");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

beforeEach(async () => {
  await pool.query("DELETE FROM access_requests");
  await pool.query("DELETE FROM resources");
});

afterAll(async () => {
  await pool.end();
});

describe("Resource Catalog API", () => {
  let resourceId;

  it("should publish a resource", async () => {
    const res = await request(app)
      .post("/resources")
      .send({
        name: "Test Resource",
        description: "A test resource",
        provider: "Provider X",
        schema: {}
      });
    expect(res.statusCode).toBe(201);

    const { rows } = await pool.query("SELECT * FROM resources");
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("Test Resource");

    resourceId = rows[0].id;
  });

  it("should retrieve all resources", async () => {
    await pool.query(
      "INSERT INTO resources (name, description, provider, schema) VALUES ($1, $2, $3, $4)",
      ["Test Resource", "A test resource", "Provider X", JSON.stringify({})]
    );

    const res = await request(app).get("/resources");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Test Resource");
  });

  it("should request access to a resource", async () => {
    const { rows } = await pool.query("INSERT INTO resources (name, description, provider, schema) VALUES ($1, $2, $3, $4) RETURNING id", 
      ["Test Resource", "A test resource", "Provider X", JSON.stringify({})]);
    resourceId = rows[0].id;

    const res = await request(app)
      .post(`/resources/${resourceId}/access-request`)
      .send({ user: "test_user" });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message", "Access request submitted");
  });

  it("should list access requests for a resource", async () => {
    const { rows } = await pool.query("INSERT INTO resources (name, description, provider, schema) VALUES ($1, $2, $3, $4) RETURNING id", 
      ["Test Resource", "A test resource", "Provider X", JSON.stringify({})]);
    resourceId = rows[0].id;

    await pool.query("INSERT INTO access_requests (resource_id, requester, status) VALUES ($1, $2, 'pending')", 
      [resourceId, "test_user"]);

    const res = await request(app).get(`/resources/${resourceId}/access-requests`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].requester).toBe("test_user");
  });

  it("should approve an access request", async () => {
    const { rows } = await pool.query("INSERT INTO resources (name, description, provider, schema) VALUES ($1, $2, $3, $4) RETURNING id", 
      ["Test Resource", "A test resource", "Provider X", JSON.stringify({})]);
    resourceId = rows[0].id;

    const requestEntry = await pool.query("INSERT INTO access_requests (resource_id, requester, status) VALUES ($1, $2, 'pending') RETURNING id", 
      [resourceId, "test_user"]);
    const requestId = requestEntry.rows[0].id;

    const res = await request(app)
      .patch(`/resources/${resourceId}/access-requests/${requestId}`)
      .send({ status: "approved" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Access request approved");
  });

  it("should return an error for an invalid access request status", async () => {
    const res = await request(app)
      .patch("/resources/1/access-requests/1")
      .send({ status: "invalid_status" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error", "Invalid status");
  });
});
