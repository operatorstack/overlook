# Overlook

A self-improving code scanner that surfaces **novel, blog-worthy technical angles** humans may have missed — not security lint, not style warnings, not things any static analyzer would catch. It scans AI-generated (or any) code repositories and looks for what's genuinely interesting: unusual architecture decisions, clever patterns, non-obvious tradeoffs, techniques worth learning from.

The system runs a negative-feedback loop: scan, measure, propose improvements, human review. Nothing changes automatically.
![Uploading image.png…]()

## Quick start

Requires **Node >= 20**.

```bash
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the dashboard has four tabs:

- **Scan** — queue a git URL, watch the pipeline run, expand results inline
- **Findings** — browse/filter all findings across jobs by confidence and keyword
- **Tickets** — implementation tickets tracking work on the system itself
- **System** — health, LLM config, build identity, docs, build history

## How it works

```
git URL → Ingest (clone) → Chunk (files → review units) → Analyze (LLM) → Sink (persist)
```

The **host runtime** orchestrates jobs, calls the LLM API, and enforces caps. The **agent package** (`src/agent/`) owns prompts, model preferences per operating mode, and chunking policy. Model selection flows through versioned config first, with env overrides as an operator knob.

| Operating mode | Intent | Default model |
|---|---|---|
| Discovery | Breadth, recall, cheaper | claude-haiku-4-5-20251001 |
| Triage | Quick filter/score | claude-haiku-4-5-20251001 |
| Deep-dive | Precision, stronger model | claude-sonnet-4-20250514 |

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with auto-restart |
| `npm run build` | TypeScript → `dist/` |
| `npm run test` | Unit/API tests (Vitest) |
| `npm run check` | Build + test |
| `npm run cli -- scan <url> [ref]` | Scan a repo via CLI |
| `npm run cli -- doctor` | Health check + next steps |

## Environment

Only `ANTHROPIC_API_KEY` is required. Everything else has sensible defaults.

| Variable | Role |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API secret (required for analysis) |
| `ANTHROPIC_MODEL` | Override model for all modes (optional — agent config is the default) |
| `PORT` | HTTP port (default 3000) |
| `NODE_ENV` | `development` or `production` |

See [`.env.example`](.env.example) for the full list.

## Architecture docs

| Document | What it covers |
|---|---|
| [`docs/systems.md`](docs/systems.md) | Goal priority, subsystems, control guardrails, update authority |
| [`docs/agentic-subsystem.md`](docs/agentic-subsystem.md) | Pipeline stages, host vs agent package, contracts, operating modes |
| [`docs/diagrams.md`](docs/diagrams.md) | ASCII architecture diagrams |
| [`docs/build-log.md`](docs/build-log.md) | Build log policy (append-only accepted changes) |
| [`docs/dev.md`](docs/dev.md) | Local development, commands, dashboard |

## Project structure

```
src/
  agent/          Agent package config (model defaults, operating modes)
  jobs/           Pipeline: ingest, chunk, analyze, sink, job store
  llm/            Anthropic client and env/model resolution
  routes/         Express routes (git jobs, tickets, info, build history)
  cli/            CLI commands (scan, doctor, check)
public/           Dashboard (single HTML file, no build step)
docs/             Architecture specs
templates/        BUILD_LOG.md entry template
BUILD_LOG.md      Append-only record of accepted changes
```
