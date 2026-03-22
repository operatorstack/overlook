import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("info routes", () => {
  const app = createApp();

  it("GET /api/info returns snapshot", async () => {
    const res = await request(app).get("/api/info").expect(200);
    expect(res.body.service).toBe("server");
    expect(typeof res.body.version).toBe("string");
    expect(res.body.build).toBeDefined();
    expect(res.body.build.displayLine).toContain("Overlook server");
    expect(res.body.build.displayLine).toContain("v");
    expect(typeof res.body.build.audienceNote).toBe("string");
    expect(res.body.llm).toBeDefined();
    expect(res.body.llm.anthropic).toMatchObject({
      configured: expect.any(Boolean),
      baseUrl: expect.any(String),
    });
    expect(typeof res.body.implementationTicketsOpen).toBe("number");
    expect(Array.isArray(res.body.implemented)).toBe(true);
    expect(Array.isArray(res.body.notImplemented)).toBe(true);
    expect(Array.isArray(res.body.repositoryDocs)).toBe(true);
  });
});
