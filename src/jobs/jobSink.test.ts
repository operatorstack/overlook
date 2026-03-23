import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hydrateJobSinkIntoStore,
  parseGitScanJobFromJson,
  persistTerminalJob,
} from "./jobSink.js";
import { clearGitScanJobsForTests, getJob } from "./memoryJobStore.js";
import type { GitScanJob } from "./types.js";

describe("jobSink", () => {
  let sinkDir: string;

  beforeEach(async () => {
    clearGitScanJobsForTests();
    sinkDir = await mkdtemp(join(tmpdir(), "overlook-job-sink-test-"));
    process.env.OVERLOOK_JOB_SINK_DIR = sinkDir;
  });

  afterEach(async () => {
    delete process.env.OVERLOOK_JOB_SINK_DIR;
    await rm(sinkDir, { recursive: true, force: true });
  });

  it("persistTerminalJob omits workspacePath and review unit bodies; keeps count", async () => {
    const job: GitScanJob = {
      jobId: "11111111-1111-4111-8111-111111111111",
      gitUrl: "https://example.com/r.git",
      ref: undefined,
      status: "done",
      createdAt: "2026-01-01T00:00:00.000Z",
      agentNote: "ok",
      workspacePath: "/tmp/should-not-persist",
      reviewUnits: [{ path: "a.ts", language: "typescript", content: "export const x = 1" }],
      findings: [],
      analyzeSkipped: true,
    };
    await persistTerminalJob(job);
    const raw = await readFile(join(sinkDir, `${job.jobId}.json`), "utf8");
    const parsed: unknown = JSON.parse(raw);
    expect(parsed).toMatchObject({
      jobId: job.jobId,
      status: "done",
      reviewUnitCount: 1,
    });
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("expected object");
    }
    expect("workspacePath" in parsed).toBe(false);
    expect("reviewUnits" in parsed).toBe(false);
  });

  it("hydrateJobSinkIntoStore loads terminal jobs into the store", async () => {
    const snapshot = {
      jobId: "22222222-2222-4222-8222-222222222222",
      gitUrl: "https://example.com/x.git",
      ref: null,
      status: "failed",
      createdAt: "2026-01-02T00:00:00.000Z",
      agentNote: "Ingest failed: x",
      lastError: "x",
      reviewUnitCount: 0,
    };
    await writeFile(join(sinkDir, `${snapshot.jobId}.json`), JSON.stringify(snapshot, null, 2), "utf8");
    await hydrateJobSinkIntoStore();
    const loaded = getJob(snapshot.jobId);
    expect(loaded).toBeDefined();
    if (loaded === undefined) {
      return;
    }
    expect(loaded.status).toBe("failed");
    expect(loaded.lastError).toBe("x");
  });

  it("parseGitScanJobFromJson rejects malformed payloads", () => {
    expect(parseGitScanJobFromJson(null)).toBeNull();
    expect(parseGitScanJobFromJson({ jobId: "x" })).toBeNull();
  });
});
