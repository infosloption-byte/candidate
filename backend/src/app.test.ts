import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.HOST = "127.0.0.1";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.DATABASE_URL = "mysql://candidate_erp:password@127.0.0.1:3306/construction_candidate_erp";

const { buildApp } = await import("./app.js");

test("GET /api/v1/health returns service health", async () => {
  const app = buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });
    const body = response.json() as { status: string; service: string; timestamp: string };

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "candidate-erp-backend");
    assert.match(body.timestamp, /^\\d{4}-\\d{2}-\\d{2}T/);
  } finally {
    await app.close();
  }
});
