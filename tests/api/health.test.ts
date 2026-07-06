import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("reports status ok and db connected against a real database", async () => {
    const response = await GET();
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.db, "connected");
    assert.equal(body.version, "1.0.0");
    assert.equal(typeof body.uptime, "number");
  });

  it("reports redis as not_configured when REDIS_URL is unset", async () => {
    const response = await GET();
    const body = await response.json();
    assert.equal(body.redis, "not_configured");
  });
});
