import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getPackageRoot } from "../paths.js";
import { parseBuildLogMarkdown, type BuildLogEntry } from "./parseBuildLog.js";

const FILE_NAME = "BUILD_LOG.md";

export function getBuildLogPath(): string {
  return join(getPackageRoot(), FILE_NAME);
}

export type BuildLogReadResult =
  | { exists: true; path: string; content: string; entries: BuildLogEntry[] }
  | { exists: false; path: string; entries: [] };

export function readBuildLog(): BuildLogReadResult {
  const path = getBuildLogPath();
  if (!existsSync(path)) {
    return { exists: false, path, entries: [] };
  }
  const content = readFileSync(path, "utf8");
  const entries = parseBuildLogMarkdown(content);
  return { exists: true, path, content, entries };
}
