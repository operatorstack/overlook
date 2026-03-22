import { execSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cloneGitWorkspace } from "./gitIngest.js";

describe("cloneGitWorkspace", () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "overlook-test-repo-"));
    execSync("git init", { cwd: repoDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', { cwd: repoDir, stdio: "ignore" });
    execSync('git config user.name "test"', { cwd: repoDir, stdio: "ignore" });
    await writeFile(join(repoDir, "README.md"), "hello\n", "utf8");
    execSync("git add README.md", { cwd: repoDir, stdio: "ignore" });
    execSync('git commit -m "init"', { cwd: repoDir, stdio: "ignore" });
  });

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it("clones a local file URL and returns commit sha", async () => {
    const fileUrl = pathToFileURL(repoDir).href;
    const result = await cloneGitWorkspace({ gitUrl: fileUrl, ref: undefined });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.commitSha.length).toBeGreaterThan(0);
    expect(result.workspacePath).toContain("overlook-ingest-");
    await rm(result.workspacePath, { recursive: true, force: true });
  });
});
