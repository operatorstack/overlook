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
    agentNote: "Agent pipeline not implemented; job registered only.",
  };
  jobs.set(job.jobId, job);
  return job;
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
