export type JobStatus = "queued" | "ingesting" | "failed" | "ingested";

export type GitScanJob = {
  jobId: string;
  gitUrl: string;
  ref: string | undefined;
  status: JobStatus;
  createdAt: string;
  agentNote: string;
  workspacePath?: string;
  resolvedCommit?: string;
  lastError?: string;
};
