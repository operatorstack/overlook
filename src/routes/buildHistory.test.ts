import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("build history API", () => {
  const app = createApp();

  it("GET /api/build-history returns structure", async () => {
    const res = await request(app).get("/api/build-history").expect(200);
    expect(res.body.source).toBe("BUILD_LOG.md");
    expect(typeof res.body.exists).toBe("boolean");
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(typeof res.body.entryCount).toBe("number");
  });

  it("GET /BUILD_LOG.md returns markdown when file exists", async () => {
    const res = await request(app).get("/BUILD_LOG.md").expect(200);
    expect(res.text).toContain("# Build log");
  });
});
