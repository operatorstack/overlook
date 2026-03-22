# Agent instructions (Cursor & humans)

This repo implements the **Overlook** host and, over time, the **scanning agent** pipeline. Persistent behavior rules for the AI also live in [`.cursor/rules/`](.cursor/rules/).

## Specs (read before changing behavior)

| Document | Use |
|----------|-----|
| [`docs/systems.md`](docs/systems.md) | Goals, subsystems, human gate, **goal priority**, what may change what |
| [`docs/agentic-subsystem.md`](docs/agentic-subsystem.md) | Fast loop: ingest → chunk → analyze → sink; **host vs agent package**; contracts |
| [`docs/build-log.md`](docs/build-log.md) | When a human **accepts** a deployable change, append policy for `BUILD_LOG.md` |
| [`docs/dev.md`](docs/dev.md) | Local run, env, dashboard |

Commits and PRs that rely on a spec should **cite the file and section heading** (per `docs/systems.md`).

## Host vs agent package

- **Host** — HTTP, job orchestration, loading a versioned agent bundle, calling the LLM API, secrets, caps, sensor-style instrumentation defined for this service.
- **Agent package** — Prompts, chunking/analysis policy, finding shape, small pure helpers bundled with that package.

Do not put secrets or ad hoc global metric schema changes in the agent package; do not bury novel scanning behavior in the host unless the spec says it lives there.

## Quality bar

- Prefer **real, integrated** code over production paths that **fake success** (e.g. marking jobs done with no work). Narrow scope per PR is fine; behavior at boundaries must be **honest** (clear errors, explicit not-implemented surfaces). **Test doubles belong in tests**, not in shipped “happy paths.”
- Use **existing** `src/` layout, naming, and patterns before adding parallel abstractions.
- After substantive changes, run **`npm run check`** (build + tests).

## Directing Cursor — git workflow

When implementing a ticket or paste block from `npm run cli -- prompt`, **start on a new branch** (`git checkout -b …` from a clean main). **Do not push** to the remote unless the operator explicitly asks.

## Directing Cursor — task template

Paste and fill:

```text
Goal: <one sentence>
Spec: docs/<file>.md § <section heading>
Host vs package: <host | agent package | both — what changes>
In scope: <files or behaviors>
Out of scope: <explicit>
Verify: npm run check + <anything else>
```

## Related entry points

- Quick sanity + next steps: `npm run cli -- doctor` (alias: `next`)
- After `npm run ticket:check`: `npm run cursor:prompt` → paste the printed block into **Cursor Agent** (Cursor does not hook npm automatically)
- Git scan jobs: `src/jobs/`, `src/routes/git.ts`
- Implementation tickets API: `src/routes/tickets.ts`, `src/tickets/`
- LLM env (host): `src/llm/`
