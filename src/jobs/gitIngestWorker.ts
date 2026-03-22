import { cloneGitWorkspace } from "./gitIngest.js";
import { getJob, patchGitScanJob } from "./memoryJobStore.js";

export function scheduleGitScanIngest(jobId: string): void {
  setImmediate(() => {
    void runGitScanIngest(jobId);
  });
}

async function runGitScanIngest(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (job === undefined || job.status !== "queued") {
    return;
  }
  const ingesting = patchGitScanJob(jobId, {
    status: "ingesting",
    agentNote: "Ingest: cloning repository.",
  });
  if (ingesting === undefined) {
    return;
  }
  const result = await cloneGitWorkspace({
    gitUrl: job.gitUrl,
    ref: job.ref,
  });
  if (result.ok) {
    patchGitScanJob(jobId, {
      status: "ingested",
      workspacePath: result.workspacePath,
      resolvedCommit: result.commitSha,
      agentNote: "Ingest complete. Chunk, analyze, and sink stages are not implemented yet.",
    });
  } else {
    patchGitScanJob(jobId, {
      status: "failed",
      lastError: result.error,
      agentNote: `Ingest failed: ${result.error}`,
    });
  }
}
