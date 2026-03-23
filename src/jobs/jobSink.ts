import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getPackageRoot } from "../paths.js";
import { getJob, importJobIfAbsent } from "./memoryJobStore.js";
import type { GitScanJob, JobStatus, ScanFinding } from "./types.js";

export function getJobSinkDirectory(): string {
  const override = process.env.OVERLOOK_JOB_SINK_DIR?.trim();
  if (override !== undefined && override.length > 0) {
    return override;
  }
  return join(getPackageRoot(), "data", "job-sink");
}

function isJobStatus(value: unknown): value is JobStatus {
  return (
    value === "queued" ||
    value === "ingesting" ||
    value === "chunking" ||
    value === "chunked" ||
    value === "analyzing" ||
    value === "done" ||
    value === "failed"
  );
}

function isScanFinding(value: unknown): value is ScanFinding {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("findingId" in value) || typeof value.findingId !== "string") {
    return false;
  }
  if (!("title" in value) || typeof value.title !== "string") {
    return false;
  }
  if (!("angle" in value) || typeof value.angle !== "string") {
    return false;
  }
  if (!("evidencePath" in value) || typeof value.evidencePath !== "string") {
    return false;
  }
  if (!("detail" in value) || typeof value.detail !== "string") {
    return false;
  }
  if (!("confidence" in value)) {
    return false;
  }
  const c = value.confidence;
  return c === "low" || c === "medium" || c === "high";
}

function parseFindings(value: unknown): ScanFinding[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const out: ScanFinding[] = [];
  for (const item of value) {
    if (!isScanFinding(item)) {
      return undefined;
    }
    out.push(item);
  }
  return out;
}

export function parseGitScanJobFromJson(value: unknown): GitScanJob | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const o = value;
  if (!("jobId" in o) || typeof o.jobId !== "string" || o.jobId.length === 0) {
    return null;
  }
  if (!("gitUrl" in o) || typeof o.gitUrl !== "string") {
    return null;
  }
  if (!("status" in o) || !isJobStatus(o.status)) {
    return null;
  }
  if (!("createdAt" in o) || typeof o.createdAt !== "string") {
    return null;
  }
  if (!("agentNote" in o) || typeof o.agentNote !== "string") {
    return null;
  }
  let ref: string | undefined;
  if ("ref" in o) {
    if (o.ref === null) {
      ref = undefined;
    } else if (typeof o.ref === "string") {
      ref = o.ref;
    } else {
      return null;
    }
  }
  const findings = parseFindings("findings" in o ? o.findings : undefined);
  if ("findings" in o && o.findings !== undefined && findings === undefined) {
    return null;
  }
  let reviewUnitCount: number | undefined;
  if ("reviewUnitCount" in o) {
    if (typeof o.reviewUnitCount !== "number" || !Number.isFinite(o.reviewUnitCount)) {
      return null;
    }
    reviewUnitCount = o.reviewUnitCount;
  }
  let reviewUnitScanTruncated: boolean | undefined;
  if ("reviewUnitScanTruncated" in o) {
    if (typeof o.reviewUnitScanTruncated !== "boolean") {
      return null;
    }
    reviewUnitScanTruncated = o.reviewUnitScanTruncated;
  }
  let analyzeSkipped: boolean | undefined;
  if ("analyzeSkipped" in o) {
    if (typeof o.analyzeSkipped !== "boolean") {
      return null;
    }
    analyzeSkipped = o.analyzeSkipped;
  }
  const job: GitScanJob = {
    jobId: o.jobId,
    gitUrl: o.gitUrl,
    ref,
    status: o.status,
    createdAt: o.createdAt,
    agentNote: o.agentNote,
    resolvedCommit:
      "resolvedCommit" in o && typeof o.resolvedCommit === "string" ? o.resolvedCommit : undefined,
    lastError: "lastError" in o && typeof o.lastError === "string" ? o.lastError : undefined,
    findings,
    reviewUnitCount,
    reviewUnitScanTruncated,
    analyzeSkipped,
  };
  return job;
}

export function toPersistedJobSnapshot(job: GitScanJob): GitScanJob {
  let reviewUnitCount = job.reviewUnitCount;
  if (job.reviewUnits !== undefined) {
    reviewUnitCount = job.reviewUnits.length;
  }
  const next: GitScanJob = {
    jobId: job.jobId,
    gitUrl: job.gitUrl,
    ref: job.ref,
    status: job.status,
    createdAt: job.createdAt,
    agentNote: job.agentNote,
    resolvedCommit: job.resolvedCommit,
    lastError: job.lastError,
    reviewUnitScanTruncated: job.reviewUnitScanTruncated,
    findings: job.findings,
    analyzeSkipped: job.analyzeSkipped,
  };
  if (reviewUnitCount !== undefined) {
    next.reviewUnitCount = reviewUnitCount;
  }
  return next;
}

export async function persistTerminalJob(job: GitScanJob): Promise<void> {
  if (job.status !== "done" && job.status !== "failed") {
    return;
  }
  const dir = getJobSinkDirectory();
  await mkdir(dir, { recursive: true });
  const snapshot = toPersistedJobSnapshot(job);
  const finalPath = join(dir, `${job.jobId}.json`);
  const tmpPath = `${finalPath}.${String(process.pid)}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await rename(tmpPath, finalPath);
}

export async function persistTerminalJobById(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (job !== undefined && (job.status === "done" || job.status === "failed")) {
    await persistTerminalJob(job);
  }
}

export async function hydrateJobSinkIntoStore(): Promise<void> {
  const dir = getJobSinkDirectory();
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.endsWith(".json")) {
      continue;
    }
    let raw: string;
    try {
      raw = await readFile(join(dir, name), "utf8");
    } catch {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const job = parseGitScanJobFromJson(parsed);
    if (job === null) {
      continue;
    }
    if (job.status !== "done" && job.status !== "failed") {
      continue;
    }
    importJobIfAbsent(job);
  }
}
