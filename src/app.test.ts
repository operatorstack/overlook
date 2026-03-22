import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("static UI", () => {
  const app = createApp();

  it("GET / serves dashboard HTML", async () => {
    const res = await request(app).get("/").expect(200);
    expect(res.text).toContain("Overlook server");
    expect(res.text).toContain("/api/info");
    expect(res.text).toContain("Agent — start here");
    expect(res.text).toContain("Start scan");
    expect(res.text).toContain("Build the agent — ticket system");
  });
});
