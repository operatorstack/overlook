import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { normalizeRef, validateGitRemoteUrl } from "../git/validateRemoteUrl.js";
import { scheduleGitScanIngest } from "../jobs/gitIngestWorker.js";
import { createGitScanJob, getJob, listGitScanJobs } from "../jobs/memoryJobStore.js";
import type { GitScanJob } from "../jobs/types.js";

export const gitRouter = Router();

const REVIEW_UNITS_FULL_IN_RESPONSE = 25;
const FINDINGS_FULL_IN_RESPONSE = 40;

function gitJobJson(job: GitScanJob, options?: { listItem?: boolean }) {
  const row: Record<string, unknown> = {
    jobId: job.jobId,
    status: job.status,
    gitUrl: job.gitUrl,
    ref: job.ref ?? null,
    createdAt: job.createdAt,
    agentNote: job.agentNote,
  };
  if (job.workspacePath !== undefined) {
    row.workspacePath = job.workspacePath;
  }
  if (job.resolvedCommit !== undefined) {
    row.resolvedCommit = job.resolvedCommit;
  }
  if (job.lastError !== undefined) {
    row.lastError = job.lastError;
  }
  if (job.reviewUnits !== undefined) {
    row.reviewUnitCount = job.reviewUnits.length;
    if (job.reviewUnitScanTruncated === true) {
      row.reviewUnitScanTruncated = true;
    }
    if (options?.listItem !== true) {
      if (job.reviewUnits.length <= REVIEW_UNITS_FULL_IN_RESPONSE) {
        row.reviewUnits = job.reviewUnits;
      } else {
        row.reviewUnits = job.reviewUnits.slice(0, REVIEW_UNITS_FULL_IN_RESPONSE);
        row.reviewUnitsTruncatedInResponse = true;
      }
    }
  }
  if (job.findings !== undefined) {
    row.findingCount = job.findings.length;
    if (job.analyzeSkipped === true) {
      row.analyzeSkipped = true;
    }
    if (options?.listItem !== true) {
      if (job.findings.length <= FINDINGS_FULL_IN_RESPONSE) {
        row.findings = job.findings;
      } else {
        row.findings = job.findings.slice(0, FINDINGS_FULL_IN_RESPONSE);
        row.findingsTruncatedInResponse = true;
      }
    }
  }
  return row;
}

type CreateBody = {
  gitUrl?: unknown;
  ref?: unknown;
};

gitRouter.post("/git/jobs", (req: Request, res: Response) => {
  const body = req.body as CreateBody;
  if (typeof body.gitUrl !== "string") {
    res.status(400).json({ error: "gitUrl is required and must be a string" });
    return;
  }
  const validation = validateGitRemoteUrl(body.gitUrl);
  if (!validation.ok) {
    res.status(400).json({ error: validation.reason });
    return;
  }
  let ref: string | undefined;
  if (body.ref !== undefined) {
    if (typeof body.ref !== "string") {
      res.status(400).json({ error: "ref must be a string when provided" });
      return;
    }
    const normalized = normalizeRef(body.ref);
    if (normalized === undefined) {
      res.status(400).json({ error: "ref is invalid" });
      return;
    }
    ref = normalized;
  }
  const job = createGitScanJob({
    jobId: randomUUID(),
    gitUrl: body.gitUrl.trim(),
    ref,
  });
  scheduleGitScanIngest(job.jobId);
  res.status(201).json(gitJobJson(job));
});

gitRouter.get("/git/jobs", (_req: Request, res: Response) => {
  const jobs = listGitScanJobs();
  res.json({
    count: jobs.length,
    jobs: jobs.map((j) => gitJobJson(j, { listItem: true })),
  });
});

gitRouter.get("/git/jobs/:jobId", (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  if (typeof jobId !== "string" || jobId.length === 0) {
    res.status(400).json({ error: "jobId is required" });
    return;
  }
  const job = getJob(jobId);
  if (job === undefined) {
    res.status(404).json({ error: "job not found" });
    return;
  }
  res.json(gitJobJson(job));
});
