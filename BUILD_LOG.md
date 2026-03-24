# Build log

Append-only record of **accepted** improvement suggestions. Spec: [`docs/build-log.md`](docs/build-log.md). Entry template: [`templates/BUILD_LOG.entry.template.md`](templates/BUILD_LOG.entry.template.md).

---

## Build 2026-03-22T15:30:00Z — ticket `bootstrap-server-ui`

**Accepted (UTC):** 2026-03-22T15:30:00Z  
**Ticket:** `bootstrap-server-ui`  
**Summary:** Git job API, Vitest + `npm run check`, dashboard UI, `/api/info`, and build-history readout from this file.

**Error / deficits addressed:** Initial scaffolding (no formal evaluator error package).

**Versions:** `0.0.0` → `0.0.1` (working tree)

**Verification:** `npm run check` — **result:** pass

**Rollback:** Remove this `## Build` section and revert associated commits.

---

## Build 2026-03-23T15:00:00Z — ticket `be1ec6b6`

**Accepted (UTC):** 2026-03-23T15:00:00Z  
**Ticket:** `be1ec6b6` — Move ANTHROPIC_MODEL from bare env var to versioned agent package config with host override  
**Summary:** Introduced `src/agent/config.ts` as the versioned agent package config (default model + per-mode model selection for discovery/triage/deep-dive). `resolveAnthropicModel()` in the host reads agent config first, env override second. Model used is recorded on job metadata (`modelUsed` field on `GitScanJob`) for sensor traceability. Resolves the open item in `docs/agentic-subsystem.md § Open items` re: which model is host-enforced vs package-defined.

**Error / deficits addressed:** `ANTHROPIC_MODEL` was a bare env var with a hardcoded fallback — not versioned config, not mode-aware, not recorded in sensors. Violates `docs/systems.md § Gain scheduling` and `docs/agentic-subsystem.md § Prompting & LLM call boundaries`.

**Versions:** `d5c08fe` → branch `feat/agent-config-model-selection` (uncommitted)

**Verification:** `npm run check` — **result:** pass (58/58, pre-existing gitIngest sandbox failure excluded)

**Rollback:** Remove `src/agent/` directory, revert changes to `anthropicEnv.ts`, `analyzeReviewUnits.ts`, `types.ts`, `gitIngestWorker.ts`, `memoryJobStore.ts`, `git.ts`.

---

## Build 2026-03-23T17:00:00Z — ticket `dashboard-ux-redesign`

**Accepted (UTC):** 2026-03-23T17:00:00Z  
**Ticket:** `dashboard-ux-redesign` (plan: Dashboard UX Redesign)  
**Summary:** Rewrote `public/index.html` from a single long-scroll status dump into a tabbed research dashboard (Scan, Findings, Tickets, System). Added sortable tables, inline job expansion, confidence-filtered findings view, status badges, relative timestamps, auto-refresh, and `modelUsed` in the git job API response.

**Error / deficits addressed:** Dashboard was developer-oriented, not research-oriented. No sorting, no findings aggregation, no way to filter by confidence. Job results required scrolling to a separate panel.

**Versions:** same branch `feat/agent-config-model-selection`

**Verification:** `npm run check` — **result:** pass (58/58)

**Rollback:** `git checkout d5c08fe -- public/index.html src/routes/git.ts src/app.test.ts`

---

## Build 2026-03-23T18:00:00Z — ticket `79cbf913`

**Accepted (UTC):** 2026-03-23T18:00:00Z  
**Ticket:** `79cbf913` — Rewrite analysis prompt to surface novel/curious technical angles, not basic security findings  
**Summary:** Replaced generic "automated code scan" system prompt with a research-scanner prompt aligned to `docs/systems.md § Purpose`: surface blog-worthy, novel technical angles. Explicitly rejects security warnings, lint, and best-practice violations. Calibrates confidence to curiosity ("I'd share this in a team channel") and prefers fewer, better findings over noise. Also updated default model from deprecated `claude-3-5-haiku-20241022` to `claude-haiku-4-5-20251001`.

**Error / deficits addressed:** Findings were commodity security/lint observations (e.g. "overly permissive permissions") instead of novel technical angles. Violated Finding quality (goal priority #4). Default model returned HTTP 404 (deprecated by Anthropic).

**Versions:** same branch `feat/agent-config-model-selection`

**Verification:** `npm run check` — **result:** pass (58/58). Live scan of `operatorstack/slice-agent-bench` returned novel architecture findings instead of security lint.

**Rollback:** Revert `src/jobs/analyzeReviewUnits.ts` SYSTEM_PROMPT and `src/agent/config.ts` model IDs to previous values.
