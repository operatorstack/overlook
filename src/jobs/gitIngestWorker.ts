import { analyzeReviewUnits } from "./analyzeReviewUnits.js";
import { chunkWorkspace, MAX_REVIEW_UNITS_PER_JOB } from "./chunkWorkspace.js";
import { cloneGitWorkspace } from "./gitIngest.js";
import { persistTerminalJobById } from "./jobSink.js";
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
      await persistTerminalJobById(jobId);
      return;
    }
    let chunkNote = "Chunk complete.";
    if (chunkResult.scanTruncated) {
      chunkNote += ` Review unit list truncated at ${String(MAX_REVIEW_UNITS_PER_JOB)} files.`;
    }
    patchGitScanJob(jobId, {
      status: "chunked",
      reviewUnits: chunkResult.units,
      reviewUnitScanTruncated: chunkResult.scanTruncated,
      agentNote: chunkNote,
    });
    patchGitScanJob(jobId, {
      status: "analyzing",
      agentNote: "Analyze: running model or skipping when LLM is not configured.",
    });
    const analyzeResult = await analyzeReviewUnits({
      reviewUnits: chunkResult.units,
      reviewUnitScanTruncated: chunkResult.scanTruncated,
    });
    if (!analyzeResult.ok) {
      patchGitScanJob(jobId, {
        status: "failed",
        lastError: analyzeResult.error,
        agentNote: `Analyze failed: ${analyzeResult.error}`,
      });
      await persistTerminalJobById(jobId);
      return;
    }
    let doneNote =
      "Pipeline complete. Findings on the job; a terminal JSON snapshot is written to the job sink directory (default data/job-sink, or OVERLOOK_JOB_SINK_DIR).";
    if (analyzeResult.skipped) {
      doneNote = `Analyze skipped (${analyzeResult.skipReason ?? "LLM not configured"}). Empty findings on the job; terminal snapshot still written to the job sink directory.`;
    }
    patchGitScanJob(jobId, {
      status: "done",
      findings: analyzeResult.findings,
      analyzeSkipped: analyzeResult.skipped,
      agentNote: doneNote,
    });
    await persistTerminalJobById(jobId);
  } else {
    patchGitScanJob(jobId, {
      status: "failed",
      lastError: result.error,
      agentNote: `Ingest failed: ${result.error}`,
    });
    await persistTerminalJobById(jobId);
  }
}
