import { chunkWorkspace, MAX_REVIEW_UNITS_PER_JOB } from "./chunkWorkspace.js";
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
    const chunking = patchGitScanJob(jobId, {
      status: "chunking",
      workspacePath: result.workspacePath,
      resolvedCommit: result.commitSha,
      agentNote: "Chunk: scanning workspace for review units.",
    });
    if (chunking === undefined) {
      return;
    }
    const chunkResult = await chunkWorkspace(result.workspacePath);
    if (!chunkResult.ok) {
      patchGitScanJob(jobId, {
        status: "failed",
        lastError: chunkResult.error,
        agentNote: `Chunk failed: ${chunkResult.error}`,
      });
      return;
    }
    let note = "Chunk complete. Analyze and sink stages are not implemented yet.";
    if (chunkResult.scanTruncated) {
      note += ` Review unit list truncated at ${String(MAX_REVIEW_UNITS_PER_JOB)} files.`;
    }
    patchGitScanJob(jobId, {
      status: "chunked",
      reviewUnits: chunkResult.units,
      reviewUnitScanTruncated: chunkResult.scanTruncated,
      agentNote: note,
    });
  } else {
    patchGitScanJob(jobId, {
      status: "failed",
      lastError: result.error,
      agentNote: `Ingest failed: ${result.error}`,
    });
  }
}
