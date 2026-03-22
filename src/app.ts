import { join } from "node:path";
import express from "express";
import { readBuildLog } from "./buildHistory/readBuildLog.js";
import { getPackageRoot } from "./paths.js";
import { gitRouter } from "./routes/git.js";
import { createInfoRouter } from "./routes/info.js";
import { ticketsRouter } from "./routes/tickets.js";

const staticRoot = join(getPackageRoot(), "public");
const docsRoot = join(getPackageRoot(), "docs");

export function createApp() {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/BUILD_LOG.md", (_req, res) => {
    const log = readBuildLog();
    if (!log.exists) {
      res.status(404).type("text/plain").send("BUILD_LOG.md not found");
      return;
    }
    res.type("text/markdown; charset=utf-8").send(log.content);
  });
  app.use("/api", createInfoRouter());
  app.use("/v1", gitRouter);
  app.use("/v1", ticketsRouter);
  app.use("/docs", express.static(docsRoot, { index: false }));
  app.use(express.static(staticRoot));
  return app;
}
