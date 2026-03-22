import "./loadEnv.js";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runDoctor } from "./cli/doctor.js";
import { parseNextTicketDraft } from "./tickets/parseNextDraft.js";

const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function runNpmScript(script: "build" | "test"): void {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(npm, ["run", script], {
    cwd: packageRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (r.error !== undefined) {
    throw r.error;
  }
  process.exit(r.status === null ? 1 : r.status);
}

function printUsage(): void {
  console.error(`Overlook server CLI (terminal-only workflow)

Usage:
  npm run cli -- <command> [args]

Commands:
  build     Run TypeScript compile (same as npm run build)
  test      Run unit tests (same as npm run test)
  check     build + test (use before accepting changes)
  doctor    Environment + server probe + next-step hints (alias: next)
  prompt    Print text to paste into Cursor Agent after ticket:check
  scan      Call API: scan <gitUrl> [ref]
  ticket    Create implementation ticket (needs server running)
  help      Show this message

Environment:
  BASE_URL   Base URL for scan (default http://127.0.0.1:3000)

Ticket (implementation queue):
  npm run ticket                    # default "build agent pipeline" ticket
  npm run cli -- ticket draft      # from docs/NEXT.md (Title: / Body:)
  npm run cli -- ticket Ship foo  # custom title (rest of args = title)

Examples:
  npm run cli -- check
  npm run cli -- doctor
  npm run cli -- prompt
  npm run cli -- scan https://github.com/org/repo.git main
  npm run ticket
  npm start
`);
}

async function postTicketJson(body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${baseUrl}/v1/tickets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    console.error(text);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(data, null, 2));
}

async function commandTicket(argv: string[]): Promise<void> {
  const sub = argv[1];
  if (sub === undefined || sub === "default") {
    await postTicketJson({});
    return;
  }
  if (sub === "draft") {
    const path = join(packageRoot, "docs", "NEXT.md");
    if (!existsSync(path)) {
      console.error("Missing docs/NEXT.md — copy from template or create it.");
      process.exit(1);
    }
    const raw = readFileSync(path, "utf8");
    const parsed = parseNextTicketDraft(raw);
    if (parsed === null) {
      console.error('docs/NEXT.md must contain a line: Title: Your ticket title');
      process.exit(1);
    }
    await postTicketJson({
      kind: "custom",
      title: parsed.title,
      body: parsed.body,
    });
    return;
  }
  const title = argv.slice(1).join(" ").trim();
  if (title.length === 0) {
    printUsage();
    process.exit(1);
  }
  await postTicketJson({ kind: "custom", title, body: "" });
}

function commandPrompt(): void {
  console.log(`--- Copy into Cursor Agent (Cmd+I / Composer) ---

Implement the next concrete slice in this repo.

@AGENTS.md — use the task template at the bottom; fill Goal / Spec / scope / Verify.

Read as needed:
@docs/agentic-subsystem.md
@docs/systems.md

Scope (pick the best source of truth):
1) If @docs/NEXT.md has a real Title line (not the placeholder), treat Title + Body as the ticket.
2) Else, with the dev server running, call GET ${baseUrl}/v1/tickets and use the newest ticket's title and body (in-memory queue from npm run ticket / ticket:check).

Constraints: no misleading success in production code; fakes only in tests. When done, run npm run check.

--- end ---`);
}

async function commandScan(gitUrl: string, ref: string | undefined): Promise<void> {
  const createRes = await fetch(`${baseUrl}/v1/git/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ref !== undefined && ref.length > 0 ? { gitUrl, ref } : { gitUrl }),
  });
  const createText = await createRes.text();
  let createJson: unknown;
  try {
    createJson = JSON.parse(createText) as unknown;
  } catch {
    console.error(createText);
    process.exit(1);
  }
  if (!createRes.ok) {
    console.error(JSON.stringify(createJson, null, 2));
    process.exit(1);
  }
  if (typeof createJson !== "object" || createJson === null || !("jobId" in createJson)) {
    console.error("Unexpected response:", createJson);
    process.exit(1);
  }
  const jobId = (createJson as { jobId: unknown }).jobId;
  if (typeof jobId !== "string") {
    console.error("Unexpected response:", createJson);
    process.exit(1);
  }
  console.log("Created:", JSON.stringify(createJson, null, 2));

  const getRes = await fetch(`${baseUrl}/v1/git/jobs/${encodeURIComponent(jobId)}`);
  const getText = await getRes.text();
  let getJson: unknown;
  try {
    getJson = JSON.parse(getText) as unknown;
  } catch {
    console.error(getText);
    process.exit(1);
  }
  if (!getRes.ok) {
    console.error(JSON.stringify(getJson, null, 2));
    process.exit(1);
  }
  console.log("Fetched:", JSON.stringify(getJson, null, 2));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (command === undefined || command === "help" || command === "-h") {
    printUsage();
    process.exit(0);
  }

  if (command === "build") {
    runNpmScript("build");
    return;
  }

  if (command === "test") {
    runNpmScript("test");
    return;
  }

  if (command === "doctor" || command === "next") {
    const code = await runDoctor(packageRoot, baseUrl);
    process.exit(code);
  }

  if (command === "check") {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const build = spawnSync(npm, ["run", "build"], {
      cwd: packageRoot,
      stdio: "inherit",
      env: process.env,
    });
    if (build.status !== 0) {
      process.exit(build.status === null ? 1 : build.status);
    }
    const test = spawnSync(npm, ["run", "test"], {
      cwd: packageRoot,
      stdio: "inherit",
      env: process.env,
    });
    process.exit(test.status === null ? 1 : test.status);
  }

  if (command === "prompt") {
    commandPrompt();
    return;
  }

  if (command === "scan") {
    const gitUrl = argv[1];
    if (typeof gitUrl !== "string" || gitUrl.length === 0) {
      printUsage();
      process.exit(1);
    }
    const ref = argv[2];
    await commandScan(gitUrl, ref);
    return;
  }

  if (command === "ticket") {
    await commandTicket(argv);
    return;
  }

  printUsage();
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
