import type { GitScanJob } from "./types.js";

const jobs = new Map<string, GitScanJob>();

export function createGitScanJob(input: {
  jobId: string;
  gitUrl: string;
  ref: string | undefined;
}): GitScanJob {
  const job: GitScanJob = {
    jobId: input.jobId,
    gitUrl: input.gitUrl,
    ref: input.ref,
    status: "queued",
    createdAt: new Date().toISOString(),
    agentNote: "Queued; ingest will run in the background.",
  };
  jobs.set(job.jobId, job);
  return job;
}

export function patchGitScanJob(
  jobId: string,
  patch: Partial<
    Pick<
      GitScanJob,
      | "status"
      | "agentNote"
      | "workspacePath"
      | "resolvedCommit"
      | "lastError"
      | "reviewUnits"
      | "reviewUnitScanTruncated"
      | "findings"
      | "analyzeSkipped"
    >
  >,
): GitScanJob | undefined {
  const existing = jobs.get(jobId);
  if (existing === undefined) {
    return undefined;
  }
  const next: GitScanJob = { ...existing, ...patch };
  jobs.set(jobId, next);
  return next;
}

export function getJob(jobId: string): GitScanJob | undefined {
  return jobs.get(jobId);
}

export function listGitScanJobs(): GitScanJob[] {
  return [...jobs.values()].sort((a, b) => {
    if (a.createdAt < b.createdAt) {
      return 1;
    }
    if (a.createdAt > b.createdAt) {
      return -1;
    }
    return 0;
  });
}

export function clearGitScanJobsForTests(): void {
  jobs.clear();
}
