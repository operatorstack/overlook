import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Router } from "express";
import { getBuildIdentity } from "../buildIdentity.js";
import { readBuildLog } from "../buildHistory/readBuildLog.js";
import { listGitScanJobs } from "../jobs/memoryJobStore.js";
import { listImplementationTickets } from "../tickets/memoryTicketStore.js";
import { getAnthropicEnv } from "../llm/anthropicEnv.js";
import { getPackageRoot } from "../paths.js";

function readPackageMeta(): { name: string; version: string } {
  const raw = readFileSync(join(getPackageRoot(), "package.json"), "utf8");
  const pkg = JSON.parse(raw) as { name?: string; version?: string };
  return {
    name: typeof pkg.name === "string" ? pkg.name : "server",
    version: typeof pkg.version === "string" ? pkg.version : "0.0.0",
  };
}

export function createInfoRouter() {
  const router = Router();
  router.get("/info", (_req, res) => {
    const pkg = readPackageMeta();
    const jobs = listGitScanJobs();
    const tickets = listImplementationTickets();
    const build = getBuildIdentity();
    const anthropic = getAnthropicEnv();
    res.json({
      service: pkg.name,
      version: pkg.version,
      jobsRegistered: jobs.length,
      implementationTicketsOpen: tickets.length,
      llm: {
        anthropic: {
          configured: anthropic.configured,
          baseUrl: anthropic.baseUrl,
        },
      },
      build: {
        productName: build.productName,
        packageVersion: build.packageVersion,
        displayLine: build.displayLine,
        audienceNote: build.audienceNote,
        gitCommit: build.gitCommit,
        buildId: build.buildId,
        nodeVersion: build.nodeVersion,
        environment: build.environment,
      },
      implemented: [
        { name: "Health check", path: "/health" },
        { name: "Dashboard UI + agent queue form", path: "/" },
        { name: "API: implementation tickets (track building the agent)", method: "POST", path: "/v1/tickets" },
        { name: "API: list implementation tickets", method: "GET", path: "/v1/tickets" },
        { name: "API: get ticket", method: "GET", path: "/v1/tickets/:ticketId" },
        { name: "API: create git job", method: "POST", path: "/v1/git/jobs" },
        { name: "API: list git jobs", method: "GET", path: "/v1/git/jobs" },
        { name: "API: get git job", method: "GET", path: "/v1/git/jobs/:jobId" },
        { name: "API: system snapshot + build + LLM env (Anthropic)", method: "GET", path: "/api/info" },
        { name: "API: build history", method: "GET", path: "/api/build-history" },
        { name: "Raw build log", method: "GET", path: "/BUILD_LOG.md" },
        { name: "Markdown docs (static)", path: "/docs/" },
        { name: "CLI: check / build / test / scan", hint: "npm run cli -- check" },
      ],
      notImplemented: [
        {
          name: "Agent pipeline",
          detail:
            "Ingest and chunk run after job creation (review units in memory). Analyze and sink are not implemented yet. Use dashboard **Build the agent — tickets** (or POST /v1/tickets) to track remaining pipeline work.",
        },
        { name: "Evaluator / proposer cron", detail: "Slow loop not wired." },
        {
          name: "Persistent stores",
          detail: "Git jobs and implementation tickets are in-memory; restart clears them until you add a database.",
        },
      ],
      repositoryDocs: [
        { label: "Systems", href: "/docs/systems.md" },
        { label: "Agentic subsystem", href: "/docs/agentic-subsystem.md" },
        { label: "Diagrams", href: "/docs/diagrams.md" },
        { label: "Build log spec", href: "/docs/build-log.md" },
        { label: "Dev / terminal", href: "/docs/dev.md" },
      ],
    });
  });

  router.get("/build-history", (_req, res) => {
    const log = readBuildLog();
    if (!log.exists) {
      res.json({
        source: "BUILD_LOG.md",
        exists: false,
        path: log.path,
        entryCount: 0,
        entries: [],
      });
      return;
    }
    res.json({
      source: "BUILD_LOG.md",
      exists: true,
      path: log.path,
      entryCount: log.entries.length,
      entries: log.entries.map((e) => ({
        titleLine: e.titleLine,
        ticket: e.ticket,
        acceptedAt: e.acceptedAt,
        summary: e.summary,
        body: e.body,
        raw: e.raw,
      })),
    });
  });

  return router;
}
