import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseNextTicketDraft } from "../tickets/parseNextDraft.js";

export function minNodeMajorFromEngines(enginesNode: string | undefined): number | null {
  if (enginesNode === undefined || enginesNode.trim().length === 0) {
    return null;
  }
  const gte = enginesNode.match(/>=\s*(\d+)/);
  if (gte !== null && gte[1] !== undefined) {
    return Number.parseInt(gte[1], 10);
  }
  const simple = enginesNode.match(/(\d+)/);
  if (simple !== null && simple[1] !== undefined) {
    return Number.parseInt(simple[1], 10);
  }
  return null;
}

export function currentNodeMajor(version: string): number {
  const part = version.split(".")[0];
  if (part === undefined) {
    return 0;
  }
  const n = Number.parseInt(part, 10);
  if (Number.isNaN(n)) {
    return 0;
  }
  return n;
}

export function nodeVersionOk(currentVersion: string, enginesNode: string | undefined): boolean {
  const min = minNodeMajorFromEngines(enginesNode);
  if (min === null) {
    return true;
  }
  return currentNodeMajor(currentVersion) >= min;
}

const NEXT_PLACEHOLDER_TITLE = "Your one-line ticket title goes here";

function readPackageEnginesNode(packageRoot: string): string | undefined {
  const path = join(packageRoot, "package.json");
  if (!existsSync(path)) {
    return undefined;
  }
  const raw = readFileSync(path, "utf8");
  const pkg = JSON.parse(raw) as { engines?: { node?: string } };
  const node = pkg.engines?.node;
  return typeof node === "string" ? node : undefined;
}

export async function runDoctor(packageRoot: string, baseUrl: string): Promise<number> {
  const enginesNode = readPackageEnginesNode(packageRoot);
  const nodeVer = process.versions.node;
  console.log("--- Overlook doctor ---\n");
  console.log(`Node: ${nodeVer} (process)`);
  if (!nodeVersionOk(nodeVer, enginesNode)) {
    const min = minNodeMajorFromEngines(enginesNode);
    console.error(`\nFAIL: package.json engines.node requires >= ${String(min)}.\n`);
    return 1;
  }
  if (enginesNode !== undefined) {
    console.log(`OK: satisfies engines.node (${enginesNode})`);
  }

  const envPath = join(packageRoot, ".env");
  if (existsSync(envPath)) {
    console.log("OK: .env present");
  } else {
    console.log("WARN: no .env — copy .env.example to .env (see docs/dev.md)");
  }

  const healthUrl = `${baseUrl.replace(/\/$/, "")}/health`;
  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      console.log(`OK: server reachable at ${baseUrl} (/health)`);
      const infoRes = await fetch(`${baseUrl.replace(/\/$/, "")}/api/info`, {
        signal: AbortSignal.timeout(3000),
      });
      if (infoRes.ok) {
        const info = (await infoRes.json()) as {
          jobsRegistered?: unknown;
          implementationTicketsOpen?: unknown;
        };
        const jobs = info.jobsRegistered;
        const tickets = info.implementationTicketsOpen;
        if (typeof jobs === "number" && typeof tickets === "number") {
          console.log(`    jobs registered: ${jobs}, implementation tickets: ${tickets}`);
        }
      }
    } else {
      console.log(`WARN: ${healthUrl} returned HTTP ${String(res.status)}`);
    }
  } catch {
    console.log(`WARN: no server at ${baseUrl} — start with: npm run dev (or npm start after build)`);
  }

  const nextPath = join(packageRoot, "docs", "NEXT.md");
  if (existsSync(nextPath)) {
    const raw = readFileSync(nextPath, "utf8");
    const draft = parseNextTicketDraft(raw);
    if (draft === null) {
      console.log("\nNEXT.md: add a line like  Title: Your task title  (see docs/NEXT.md)");
    } else if (draft.title === NEXT_PLACEHOLDER_TITLE) {
      console.log("\nNEXT.md: replace placeholder Title: line with a real ticket title");
    } else {
      console.log(`\nNEXT.md draft title: ${draft.title}`);
      if (draft.body.length > 0) {
        console.log("(body present — use npm run ticket -- draft to file)");
      }
    }
  } else {
    console.log("\nWARN: docs/NEXT.md missing");
  }

  console.log(`
Next actions:
  npm run cli -- check     verify compile + tests (before merge)
  npm run dev              run API + dashboard
  npm run cli -- scan URL  queue a git job (server must be up)

Specs: docs/systems.md · docs/agentic-subsystem.md
Direct Cursor: paste the task template from AGENTS.md
`);
  return 0;
}
