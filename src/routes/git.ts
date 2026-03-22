import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { normalizeRef, validateGitRemoteUrl } from "../git/validateRemoteUrl.js";
import { createGitScanJob, getJob, listGitScanJobs } from "../jobs/memoryJobStore.js";

export const gitRouter = Router();

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
  res.status(201).json({
    jobId: job.jobId,
    status: job.status,
    gitUrl: job.gitUrl,
    ref: job.ref ?? null,
    createdAt: job.createdAt,
    agentNote: job.agentNote,
  });
});

gitRouter.get("/git/jobs", (_req: Request, res: Response) => {
  const jobs = listGitScanJobs();
  res.json({
    count: jobs.length,
    jobs: jobs.map((j) => ({
      jobId: j.jobId,
      status: j.status,
      gitUrl: j.gitUrl,
      ref: j.ref ?? null,
      createdAt: j.createdAt,
      agentNote: j.agentNote,
    })),
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
  res.json({
    jobId: job.jobId,
    status: job.status,
    gitUrl: job.gitUrl,
    ref: job.ref ?? null,
    createdAt: job.createdAt,
    agentNote: job.agentNote,
  });
});
