import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { clearGitScanJobsForTests } from "../jobs/memoryJobStore.js";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

async function pollJobBody(
  app: ReturnType<typeof createApp>,
  jobId: string,
  predicate: (status: string) => boolean,
  timeoutMs = 45_000,
): Promise<Record<string, unknown>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request(app).get(`/v1/git/jobs/${encodeURIComponent(jobId)}`).expect(200);
    const body: unknown = res.body;
    if (!isRecord(body)) {
      throw new Error("expected object body");
    }
    const st = body.status;
    if (typeof st === "string" && predicate(st)) {
      return body;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timeout polling job ${jobId}`);
}

describe("git routes", () => {
  const app = createApp();
  let testSinkDir: string;

  beforeEach(async () => {
    clearGitScanJobsForTests();
    testSinkDir = await mkdtemp(join(tmpdir(), "overlook-git-route-sink-"));
    process.env.OVERLOOK_JOB_SINK_DIR = testSinkDir;
  });

  afterEach(async () => {
    delete process.env.OVERLOOK_JOB_SINK_DIR;
    await rm(testSinkDir, { recursive: true, force: true });
  });

  it("POST /v1/git/jobs creates job", async () => {
    const res = await request(app)
      .post("/v1/git/jobs")
      .send({ gitUrl: "https://github.com/org/repo.git", ref: "main" })
      .expect(201);
    expect(res.body).toMatchObject({
      status: "queued",
      gitUrl: "https://github.com/org/repo.git",
      ref: "main",
    });
    expect(typeof res.body.jobId).toBe("string");
    expect(res.body.createdAt).toBeDefined();
  });

  it("GET /v1/git/jobs/:jobId returns job", async () => {
    const created = await request(app)
      .post("/v1/git/jobs")
      .send({ gitUrl: "https://example.com/a.git" })
      .expect(201);
    const jobId = created.body.jobId;
    if (typeof jobId !== "string") {
      throw new Error("expected jobId string");
    }
    const body = await pollJobBody(app, jobId, (s) => s === "failed" || s === "done");
    expect(body.jobId).toBe(jobId);
    expect(body.status).toBe("failed");
    const err = body.lastError;
    expect(typeof err === "string" && err.length > 0).toBe(true);
  });

  it("GET unknown job returns 404", async () => {
    await request(app).get("/v1/git/jobs/00000000-0000-4000-8000-000000000000").expect(404);
  });

  it("POST rejects invalid body", async () => {
    await request(app).post("/v1/git/jobs").send({}).expect(400);
  });

  it("POST /v1/git/jobs with deferStart keeps job queued until run", async () => {
    const created = await request(app)
      .post("/v1/git/jobs")
      .send({ gitUrl: "https://example.com/defer.git", deferStart: true })
      .expect(201);
    const jobId = created.body.jobId;
    if (typeof jobId !== "string") {
      throw new Error("expected jobId string");
    }
    const q = await request(app).get(`/v1/git/jobs/${encodeURIComponent(jobId)}`).expect(200);
    expect(q.body.status).toBe("queued");
    await request(app).post(`/v1/git/jobs/${encodeURIComponent(jobId)}/run`).expect(202);
    const body = await pollJobBody(app, jobId, (s) => s === "failed" || s === "done");
    expect(body.status).toBe("failed");
  });

  it("POST /v1/git/jobs/:jobId/run returns 409 when not queued", async () => {
    const created = await request(app)
      .post("/v1/git/jobs")
      .send({ gitUrl: "https://example.com/y.git" })
      .expect(201);
    const jobId = created.body.jobId;
    if (typeof jobId !== "string") {
      throw new Error("expected jobId string");
    }
    await pollJobBody(app, jobId, (s) => s === "failed" || s === "done");
    const res = await request(app).post(`/v1/git/jobs/${encodeURIComponent(jobId)}/run`).expect(409);
    expect(typeof res.body.error).toBe("string");
  });

  it("GET /v1/git/jobs lists jobs", async () => {
    const created = await request(app)
      .post("/v1/git/jobs")
      .send({ gitUrl: "https://example.com/x.git" })
      .expect(201);
    const jobId = created.body.jobId;
    if (typeof jobId !== "string") {
      throw new Error("expected jobId string");
    }
    await pollJobBody(app, jobId, (s) => s === "failed" || s === "done");
    const res = await request(app).get("/v1/git/jobs").expect(200);
    expect(res.body.count).toBe(1);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].gitUrl).toBe("https://example.com/x.git");
  });
});
