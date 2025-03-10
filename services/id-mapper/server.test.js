const request = require('supertest');
const { expect } = require('chai');
const app = require('./server'); // Adjust the path if your main file is named differently

// A valid token that passes the simple token validation middleware.
const validToken = "valid_token";

describe("ID Mapping & Verification API", function () {
  // Variables to store data between tests.
  let mappingRequest;
  const testServiceId = "electricity-test-123";
  const citizenDetails = {
    name: "Test User",
    phone_number: "9876543210",
    address: "Test Address",
    pin_code: "123456"
  };

  // 1. Test /mapping endpoint to create a new mapping request.
  it("should create a new mapping request", async function () {
    const res = await request(app)
      .post("/mapping")
      .set("Authorization", "Bearer " + validToken)
      .send({
        service_id: testServiceId,
        citizen_details: citizenDetails,
        additional_proof: "proof-data"
      });
      
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("mapping_request_id");
    expect(res.body.status).to.equal("pending");
    mappingRequest = res.body; // store for later tests
  });

  // 2. Test /mapping endpoint without required fields returns error.
  it("should return 400 if required fields are missing in /mapping", async function () {
    const res = await request(app)
      .post("/mapping")
      .set("Authorization", "Bearer " + validToken)
      .send({
        service_id: testServiceId // missing citizen_details
      });
      
    expect(res.status).to.equal(400);
  });

  // 3. Test /verification endpoint on a pending mapping without Aadhaar update.
  it("should return 404 when verifying a pending mapping with no extra parameters", async function () {
    const res = await request(app)
      .post("/verification")
      .set("Authorization", "Bearer " + validToken)
      .send({
        service_id: testServiceId
      });
      
    expect(res.status).to.equal(404);
    expect(res.body).to.have.property("error");
  });

  // 4. Test /verification endpoint to update a pending mapping with Aadhaar.
  it("should update pending mapping with provided Aadhaar and verify it", async function () {
    const aadhaar_id = "aadhaar-test-123";
    const res = await request(app)
      .post("/verification")
      .set("Authorization", "Bearer " + validToken)
      .send({
        service_id: testServiceId,
        mapping_request_id: mappingRequest.mapping_request_id,
        aadhaar_id: aadhaar_id
      });
      
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("aadhaar_id");
    expect(res.body.aadhaar_id).to.equal(aadhaar_id);
    expect(res.body).to.have.property("linked_service_ids");
    expect(res.body.linked_service_ids).to.include(testServiceId);
  });

  // 5. Test /verification endpoint on an already verified mapping.
  it("should return verification details for an already verified mapping", async function () {
    const aadhaar_id = "aadhaar-test-123";
    const res = await request(app)
      .post("/verification")
      .set("Authorization", "Bearer " + validToken)
      .send({
        service_id: testServiceId
      });
      
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("aadhaar_id");
    expect(res.body.aadhaar_id).to.equal(aadhaar_id);
    expect(res.body.linked_service_ids).to.include(testServiceId);
  });

  // 6. Test /dispute endpoint.
  it("should create a dispute", async function () {
    const res = await request(app)
      .post("/dispute")
      .set("Authorization", "Bearer " + validToken)
      .send({
        service_id: testServiceId,
        aadhaar_id: "aadhaar-test-123",
        reason: "Incorrect mapping for testing purposes.",
        supporting_documents: ["doc1", "doc2"]
      });
      
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("dispute_id");
    expect(res.body.status).to.equal("pending");
  });
});
