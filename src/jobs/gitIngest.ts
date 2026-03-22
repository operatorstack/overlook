import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAX_ERROR_LEN = 4000;

type GitCommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export function runGitCommand(args: string[]): Promise<GitCommandResult> {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err: Error) => {
      resolve({ code: -1, stdout, stderr: `${stderr}${err.message}` });
    });
    child.on("close", (code) => {
      const c = code === null ? 1 : code;
      resolve({ code: c, stdout, stderr });
    });
  });
}

function clipError(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_ERROR_LEN) {
    return t;
  }
  return `${t.slice(0, MAX_ERROR_LEN)}…`;
}

export type CloneGitWorkspaceResult =
  | { ok: true; workspacePath: string; commitSha: string }
  | { ok: false; error: string };

export async function cloneGitWorkspace(input: {
  gitUrl: string;
  ref: string | undefined;
}): Promise<CloneGitWorkspaceResult> {
  const prefix = join(tmpdir(), "overlook-ingest-");

  async function tryShallowClone(targetDir: string): Promise<boolean> {
    const args =
      input.ref !== undefined
        ? ["clone", "--depth", "1", "--branch", input.ref, "--", input.gitUrl, targetDir]
        : ["clone", "--depth", "1", "--", input.gitUrl, targetDir];
    const r = await runGitCommand(args);
    return r.code === 0;
  }

  const workspacePath = await mkdtemp(prefix);
  if (await tryShallowClone(workspacePath)) {
    const head = await runGitCommand(["-C", workspacePath, "rev-parse", "HEAD"]);
    if (head.code !== 0) {
      await rm(workspacePath, { recursive: true, force: true });
      return { ok: false, error: clipError(head.stderr) };
    }
    const sha = head.stdout.trim();
    if (sha.length === 0) {
      await rm(workspacePath, { recursive: true, force: true });
      return { ok: false, error: "git rev-parse HEAD returned empty output" };
    }
    return { ok: true, workspacePath, commitSha: sha };
  }

  await rm(workspacePath, { recursive: true, force: true });

  const fullPath = await mkdtemp(prefix);
  const full = await runGitCommand(["clone", "--", input.gitUrl, fullPath]);
  if (full.code !== 0) {
    await rm(fullPath, { recursive: true, force: true });
    return { ok: false, error: clipError(full.stderr) };
  }

  if (input.ref !== undefined) {
    const co = await runGitCommand(["-C", fullPath, "checkout", input.ref]);
    if (co.code !== 0) {
      await rm(fullPath, { recursive: true, force: true });
      return { ok: false, error: clipError(co.stderr) };
    }
  }

  const head = await runGitCommand(["-C", fullPath, "rev-parse", "HEAD"]);
  if (head.code !== 0) {
    await rm(fullPath, { recursive: true, force: true });
    return { ok: false, error: clipError(head.stderr) };
  }
  const sha = head.stdout.trim();
  if (sha.length === 0) {
    await rm(fullPath, { recursive: true, force: true });
    return { ok: false, error: "git rev-parse HEAD returned empty output" };
  }
  return { ok: true, workspacePath: fullPath, commitSha: sha };
}
