# Agentic subsystem: scanning pipeline & agent package

**Path (for citations):** `server/docs/agentic-subsystem.md` — cite this file and section headings when changing prompts, chunking, or agent logic.  
**Control layer (goals, guardrails, authority):** `[systems.md](./systems.md)`. **Figures:** `[diagrams.md](./diagrams.md)`.  
**Level:** subsystem architecture — boundaries and contracts; not full API schemas.  
**Owner / last reviewed:** *TBD*

## Relation to the systems doc

This document describes the **fast loop** inside the **Runtime (plant)** from `[systems.md](./systems.md)`: how inputs become findings, and what lives in the **deployable agent package** vs the **stable host runtime**. Any improvement that touches this subsystem must still satisfy **goal priority** and **update authority** there.

## Responsibilities split


| Layer             | Owns                                                                                                                                                                                                  | Does not own                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Host runtime**  | HTTP/job orchestration, loading a specific **agent package version**, calling the LLM API, enforcing rate limits and secrets handling, writing **sensor events** defined by approved instrumentation. | Novelty heuristics, prompt wording, chunking policy—those ship in the **agent package** unless explicitly part of the host. |
| **Agent package** | Prompts, structured instructions, chunking parameters, analysis strategy (single- or multi-pass), output shaping for findings, optional small **pure** helpers bundled with the package.              | Raw network credentials, changing global sensor schema without a reviewed change (see systems doc).                         |


## Operating modes (autopilot analogy)

Autopilot **modes** change *how aggressively* or *how expensively* the inner loop pursues the mission without rewriting the FCC. Here the **host** selects the active **mode** (per job or per queue); the **agent package** defines behavior for each mode (prompt variants, chunk budgets, single vs multi-pass). Exact mode names are implementation-defined; typical placeholders:


| Mode (example) | Intent                                                                             |
| -------------- | ---------------------------------------------------------------------------------- |
| **Discovery**  | Favor recall and breadth; more chunks or cheaper model; acceptable higher noise.   |
| **Triage**     | Cheap pass to filter or score before deeper analysis.                              |
| **Deep-dive**  | Fewer, richer units; stronger model or second pass; favor precision over coverage. |


**Rules:** only **one dominant mode** per job unless a documented **blend** exists; **mode** must appear in job metadata and sensors for traceability. Changing the **set of modes** or their **safety envelope** is a **human-reviewed** change (same as control-law updates). See `[systems.md` § Autopilot analogy](./systems.md#autopilot-analogy-software-flight-control) for FCC vs laws vs human disconnect.

## Pipeline stages (conceptual)

1. **Ingest** — resolve target (e.g. git URL + ref), materialize a **workspace** for the job; record provenance for sensors.
2. **Chunk** — turn the workspace into **review units** (files, regions, or symbols) with metadata (path, language). Bounded by token/cost policy from the host or package config as designed.
3. **Analyze** — LLM (and optional tools) consumes units + context (e.g. README excerpt); produces **candidate findings** with evidence pointers into the code.
4. **Sink** — persist findings in operator-chosen form (files, DB, queue); emit **outcome** sensor events (yield, empties, errors).

Stages **2–3** are the primary locus of **agent package** iteration; **1 and 4** may span host and package depending on implementation—document the split when code exists.

## Contracts (for stable references)

Improvement tickets should name which contract they change.

- **Job context** — what the agent is allowed to assume about inputs (repo layout, languages, max size).  
- **Review unit shape** — fields each chunk carries into analysis.  
- **Finding shape** — required fields (e.g. title, angle, evidence refs, confidence); must support **auditability** (systems goal priority #2).  
- **Failure behavior** — when to skip, retry, or fail the job visibly (systems: pipeline correctness).

## Prompting & LLM call boundaries

- **System vs task prompts** — keep a clear split so proposer tickets can target “behavior” vs “format” without entangling secrets.  
- **Model parameters** — if exposed (temperature, max tokens), decide whether they are **host policy** or **package config** and cite this section when moving them.  
- **Tools** — if the agent uses tools, list allowed tool classes here when defined; unknown tools remain out of scope for autonomous proposal unless explicitly allowlisted in the systems **actuator** policy.

## Future: Anthropic (env wiring)

When you add a coding or analysis agent on **Anthropic**, configure the **host runtime** via `.env` (see `server/.env.example` and `docs/dev.md`):

| Variable | Role |
| -------- | ---- |
| `ANTHROPIC_API_KEY` | Secret credential for the API (never commit). |
| `ANTHROPIC_URL` | Optional base URL for HTTP calls. Use this **or** `ANTHROPIC_BASE_URL`; if both are set, **`ANTHROPIC_URL` wins**. |
| `ANTHROPIC_BASE_URL` | Same intent as `ANTHROPIC_URL` if you prefer a more explicit name. |

If neither URL variable is set, the default base is **`https://api.anthropic.com`**. The module `server/src/llm/anthropicEnv.ts` (`getAnthropicEnv()`) is the single place to read these for future clients; **`GET /api/info`** exposes **`llm.anthropic.configured`** and **`baseUrl`** (never the API key).

## Testing expectations (agent package)

- **Golden inputs** — small fixed workspaces or snapshots; expected **shape** of outputs or snapshot tests as the team defines.  
- **Regression** — a change to prompts or analysis logic should declare which golden cases it affects in the improvement ticket.

## Sensors (agent-relevant)

The systems doc lists **categories**. This subsystem is responsible for **emitting** (via the host) events such as: chunk count, analysis pass count, per-stage latency, token usage (if available), parse/tool errors from the model layer, and finding counts. **New event names or semantics** require the same human-reviewed path as code (see **Sensor bus** in `[systems.md](./systems.md)`).

## Out of scope (this document)

Evaluator and proposer algorithms, cron scheduling, ticket storage, and UI — see `[systems.md](./systems.md)`.

## Open items (fill as you implement)

- Exact **finding** JSON/schema and example.  
- Default **chunking** strategy and limits.  
- List of **golden** workspaces and how to run them in CI.  
- Which **model** and parameters are host-enforced vs package-defined.  
- **Implementation tickets** (`POST /v1/tickets`, dashboard **Build the agent — tickets**) track *intent* to build this pipeline; replace or augment with your real issue tracker when ready.

