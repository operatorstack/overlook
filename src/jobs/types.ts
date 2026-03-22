export type JobStatus = "queued" | "ingesting" | "chunking" | "chunked" | "failed";

export type ReviewUnit = {
  path: string;
  language: string;
  content: string;
};

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
  reviewUnits?: ReviewUnit[];
  reviewUnitScanTruncated?: boolean;
};
