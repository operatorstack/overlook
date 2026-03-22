import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ReviewUnit } from "./types.js";

export const MAX_REVIEW_UNITS_PER_JOB = 400;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_CONTENT_CHARS = 24 * 1024;

const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "target",
  ".next",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  ".tox",
  ".cache",
]);

function languageFromPath(relPath: string): string {
  const lower = relPath.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) {
    return "typescript";
  }
  if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) {
    return "javascript";
  }
  if (lower.endsWith(".py")) {
    return "python";
  }
  if (lower.endsWith(".go")) {
    return "go";
  }
  if (lower.endsWith(".rs")) {
    return "rust";
  }
  if (lower.endsWith(".java")) {
    return "java";
  }
  if (lower.endsWith(".md")) {
    return "markdown";
  }
  if (lower.endsWith(".json")) {
    return "json";
  }
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) {
    return "yaml";
  }
  if (lower.endsWith(".toml")) {
    return "toml";
  }
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return "html";
  }
  if (lower.endsWith(".css")) {
    return "css";
  }
  if (lower.endsWith(".c") || lower.endsWith(".h")) {
    return "c";
  }
  if (lower.endsWith(".cpp") || lower.endsWith(".cc") || lower.endsWith(".hpp")) {
    return "cpp";
  }
  return "unknown";
}

async function collectFilePaths(root: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIR_NAMES.has(ent.name)) {
          continue;
        }
        await walk(full);
      } else if (ent.isFile()) {
        out.push(full);
      }
    }
  }

  await walk(root);
  out.sort();
  return out;
}

function clipContent(text: string): string {
  if (text.length <= MAX_CONTENT_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_CONTENT_CHARS)}…`;
}

export type ChunkWorkspaceResult =
  | { ok: true; units: ReviewUnit[]; scanTruncated: boolean }
  | { ok: false; error: string };

export async function chunkWorkspace(workspaceRoot: string): Promise<ChunkWorkspaceResult> {
  try {
    const absoluteFiles = await collectFilePaths(workspaceRoot);
    const units: ReviewUnit[] = [];
    let scanTruncated = false;

    for (const abs of absoluteFiles) {
      if (units.length >= MAX_REVIEW_UNITS_PER_JOB) {
        scanTruncated = true;
        break;
      }
      let st;
      try {
        st = await stat(abs);
      } catch {
        continue;
      }
      if (!st.isFile() || st.size > MAX_FILE_BYTES) {
        continue;
      }
      let raw: string;
      try {
        raw = await readFile(abs, "utf8");
      } catch {
        continue;
      }
      const rel = relative(workspaceRoot, abs);
      const normalized = rel.split("\\").join("/");
      if (normalized.length === 0 || normalized.startsWith("..")) {
        continue;
      }
      units.push({
        path: normalized,
        language: languageFromPath(normalized),
        content: clipContent(raw),
      });
    }

    return { ok: true, units, scanTruncated };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
