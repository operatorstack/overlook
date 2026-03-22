# Build log (`BUILD_LOG.md`)

**Path (for citations):** `server/docs/build-log.md`  
**Systems context:** [`systems.md` § Build log](./systems.md#build-log-accepted-suggestions)

## Purpose

When a human **accepts** an improvement suggestion, the resulting codebase (repository root or **agent package root**, whichever is the unit of deploy) must include an updated **`BUILD_LOG.md`**: an **append-only** audit trail so operators and the evaluator can tie **live behavior** to **decisions** (systems goal: integrity and auditability).

## File location

| Deployable unit | Path |
|-----------------|------|
| Whole service repo | Repository root: `./BUILD_LOG.md` |
| Separate agent package only | Root of that package: `./BUILD_LOG.md` |

If both change in one acceptance, use the **service repo** log as canonical, or duplicate a one-line cross-reference in the agent package log—pick one rule per project and stay consistent.

## Rules

- **Filename:** `BUILD_LOG.md` (exact, at chosen root).  
- **Append-only:** add a new **entry** per acceptance; do not delete or rewrite prior entries (fix forward with a later entry if something was wrong).  
- **Timing:** the entry is part of the **same change set** as the accepted implementation (same commit or same deploy bundle).  
- **Machine-friendly:** keep a stable **entry header** line pattern so scripts can parse (see template).

## Entry content (required)

Each entry should include:

1. **UTC timestamp** — when acceptance landed (not when the ticket was drafted).  
2. **Ticket ID** — stable identifier for the improvement ticket.  
3. **Summary** — one short paragraph: what changed and why.  
4. **Deficits / error package** — pointer (link, path, or id) to what gap this addressed.  
5. **Version transition** — agent package and/or host release identity **before → after** (git SHA, semver, or content hash).  
6. **Verification** — what was run and result (e.g. `npm test`, golden job ids).  
7. **Rollback** — how to revert (previous SHA, tag, or artifact id).

Optional: acceptor handle, related docs updated, sensor/event ids added.

## Runtime

The server exposes **`GET /api/build-history`** (JSON, newest first) and **`GET /BUILD_LOG.md`** (raw file) for dashboards and tooling.

## Template

Use [`../templates/BUILD_LOG.entry.template.md`](../templates/BUILD_LOG.entry.template.md) when generating or reviewing entries.
