import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPackageRoot } from "./paths.js";

export type BuildIdentity = {
  productName: string;
  packageVersion: string;
  displayLine: string;
  audienceNote: string;
  gitCommit: string | null;
  buildId: string | null;
  nodeVersion: string;
  environment: string;
};

function readPackageVersion(): string {
  const raw = readFileSync(join(getPackageRoot(), "package.json"), "utf8");
  const pkg = JSON.parse(raw) as { version?: string };
  return typeof pkg.version === "string" ? pkg.version : "0.0.0";
}

function firstEnv(keys: string[]): string | null {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim();
    }
  }
  return null;
}

export function getBuildIdentity(): BuildIdentity {
  const packageVersion = readPackageVersion();
  const productName = "Overlook server";
  const gitCommit = firstEnv([
    "GIT_COMMIT_SHA",
    "VERCEL_GIT_COMMIT_SHA",
    "RAILWAY_GIT_COMMIT_SHA",
    "COMMIT_SHA",
    "SOURCE_VERSION",
  ]);
  const buildId = firstEnv(["BUILD_ID", "RENDER_GIT_COMMIT", "CF_PAGES_COMMIT_SHA"]);
  const shortCommit =
    gitCommit !== null && gitCommit.length > 7 ? gitCommit.slice(0, 7) : gitCommit;
  const displayLine =
    shortCommit !== null
      ? `${productName} v${packageVersion} (source ${shortCommit})`
      : `${productName} v${packageVersion}`;
  return {
    productName,
    packageVersion,
    displayLine,
    audienceNote:
      "For operators and teammates: live status of this deployment — health, features, jobs, and accepted changes from the build log.",
    gitCommit,
    buildId,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
  };
}
