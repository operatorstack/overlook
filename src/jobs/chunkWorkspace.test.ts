import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chunkWorkspace, MAX_REVIEW_UNITS_PER_JOB } from "./chunkWorkspace.js";

describe("chunkWorkspace", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "overlook-chunk-test-"));
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "node_modules", "fake-pkg"), { recursive: true });
    await writeFile(join(root, "src", "a.ts"), "export const x = 1;\n", "utf8");
    await writeFile(join(root, "node_modules", "fake-pkg", "bad.ts"), "skip me\n", "utf8");
    await writeFile(join(root, "readme.md"), "# hi\n", "utf8");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("collects text files with languages and skips node_modules", async () => {
    const result = await chunkWorkspace(root);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.scanTruncated).toBe(false);
    const paths = result.units.map((u) => u.path).sort();
    expect(paths).toEqual(["readme.md", "src/a.ts"]);
    const ts = result.units.find((u) => u.path === "src/a.ts");
    expect(ts?.language).toBe("typescript");
    expect(ts?.content).toContain("export const x");
    expect(result.units.some((u) => u.path.includes("node_modules"))).toBe(false);
  });

  it("sets scanTruncated when file count exceeds cap", async () => {
    for (let i = 0; i < MAX_REVIEW_UNITS_PER_JOB + 3; i += 1) {
      await writeFile(join(root, `f${String(i)}.txt`), "x\n", "utf8");
    }
    const result = await chunkWorkspace(root);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.scanTruncated).toBe(true);
    expect(result.units.length).toBe(MAX_REVIEW_UNITS_PER_JOB);
  });
});
