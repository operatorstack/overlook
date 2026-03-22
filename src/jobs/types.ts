export type JobStatus = "queued";

export type GitScanJob = {
  jobId: string;
  gitUrl: string;
  ref: string | undefined;
  status: JobStatus;
  createdAt: string;
  agentNote: string;
};
