# Overlook — documentation index

Specs live here so **humans, CI, and improvement agents** can reference stable paths in-repo.

| Document | Use when |
|----------|----------|
| [`systems.md`](./systems.md) | Control loop, goal priority, guardrails, **autopilot analogy**, who may change what, sensors/evaluator/proposer roles. |
| [`agentic-subsystem.md`](./agentic-subsystem.md) | Fast loop: ingest → chunk → analyze → sink; **operating modes**; agent package vs host; contracts for findings and prompts. |
| [`diagrams.md`](./diagrams.md) | **ASCII diagrams** — full loop, signal flow, inner loop, modes. |
| [`build-log.md`](./build-log.md) | **`BUILD_LOG.md`** — append-only log required on every accepted suggestion. |
| [`dev.md`](./dev.md) | **Terminal workflow** — `npm run check`, CLI, `scripts/build.sh`, tests per feature. |
| [`NEXT.md`](./NEXT.md) | **Draft next ticket** — `Title:` / `Body:` then `npm run ticket -- draft`. |

**Citation convention:** `server/docs/<file>.md` + **section heading** (e.g. “Goal priority”, “Pipeline stages”).
