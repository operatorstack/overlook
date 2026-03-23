export type JobStatus =
  | "queued"
  | "ingesting"
  | "chunking"
  | "chunked"
  | "analyzing"
  | "done"
  | "failed";

export type ReviewUnit = {
  path: string;
  language: string;
  content: string;
};

export type ScanFinding = {
  findingId: string;
  title: string;
  angle: string;
  evidencePath: string;
  confidence: "low" | "medium" | "high";
  detail: string;
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
  /** Set when review unit bodies are omitted (e.g. disk snapshot) but count is known. */
  reviewUnitCount?: number;
  reviewUnitScanTruncated?: boolean;
  findings?: ScanFinding[];
  analyzeSkipped?: boolean;
};
