# Systems: self-improving code scanner (working name: Overlook)

**Path (for citations):** `server/docs/systems.md` — improvement tickets, commits, and agent outputs should cite **this file and the section heading** they rely on.  
**Companion:** agent behavior and fast-loop detail → [`agentic-subsystem.md`](./agentic-subsystem.md). **Figures:** [`diagrams.md`](./diagrams.md).  
**Level:** systems architecture only — not APIs, storage, or UI.  
**Owner / last reviewed:** _TBD_

## Purpose

Run a **negative-feedback-style loop** around an agent that **scans AI-generated code** and surfaces **blog-worthy or novel technical angles** humans may have missed. The system **measures its own behavior**, forms a structured **gap vs goal**, and emits **improvement tickets**. **Humans accept or reject** tickets; **nothing applies automatically** to the running agent.

## Reference (goal)

Qualitative: **useful, novel, actionable findings** under **cost and latency** operators accept, with **evidence** tied to scanned code. **Human approval** is the main gate for changing behavior, so the reference may stay informal early on.

When objectives conflict, **goal priority** (below) decides what wins. The evaluator and proposer must **respect that ordering** in how they frame deficits and tickets.

## Goal priority (ordered — higher first)

1. **Safety, privacy, and abuse resistance** — no suggestion may weaken handling of secrets, PII, untrusted code execution boundaries, or operator-defined red lines.  
2. **System integrity and auditability** — do not propose changes that break traceability (what version ran, what was scanned, immutable logs) without an explicit migration path in the ticket.  
3. **Pipeline correctness** — ingest, chunking, and persistence behave as specified; failures are visible and attributable.  
4. **Finding quality** — novelty, usefulness, and grounding in evidence (the core scanner mission).  
5. **Efficiency** — cost, latency, and operator toil within agreed bounds.

Lower-priority goals must **not** be improved by violating higher-priority ones.

## Subsystems

| Subsystem | Responsibility |
|-----------|------------------|
| **Runtime (plant)** | Runs scans end-to-end (ingest → chunk → analyze → persist findings) using the **deployed agent package** and configured models. Changes only after **human-approved** updates. Fast-loop detail: [`agentic-subsystem.md`](./agentic-subsystem.md). |
| **Sensor bus** | **Append-only events** and **rolled-up metrics** from the pipeline (health, cost, outcomes, agent version, model behavior). |
| **Evaluator (slow loop)** | On a **schedule**, reads aggregates (and optional **golden replays**), outputs one **error package**: **deficits** + **evidence**, vs reference. |
| **Proposer (controller)** | Reads **error package** + **agent artifacts** (prompts, logic, config). Outputs **one human-reviewable improvement ticket** (prefer **minimal, self-contained** changes as the system matures). |
| **Human gate** | Accept → publish new agent package / prompts / instrumentation; reject or defer → plant unchanged. Each accept **appends** [`BUILD_LOG.md`](./build-log.md) per policy. |

## Update authority (what each subsystem may change)

| Subsystem | May update | Must not |
|-----------|------------|----------|
| **Runtime** | **Scan artifacts only** for that run (workspace, job state, persisted findings for jobs it processes). Emits sensor events defined by the **currently deployed** instrumentation. | Change **deployed** agent package, prompts, model routing, or global sensor **schema** without going through the human gate. |
| **Sensor bus** | **Event instances** (writes) from instrumented code paths in releases humans approved. **Schema or new event types** ship only as part of an **accepted ticket** (same as code). | Silently redefine meaning of existing metrics or drop required fields without a versioned change and review. |
| **Evaluator** | **Error package** documents and **internal eval config** (e.g. thresholds, window length) if that config is **versioned and reviewed** like code—or keep eval logic in-repo and change only via tickets. | Apply agent or prompt changes directly; mutate production data beyond read aggregates. |
| **Proposer** | **Text of the pending ticket** (proposal narrative, suggested diffs as content). | Apply any change to runtime, secrets, or live config; open a **second** concurrent pending ticket (see anti-thrash). |
| **Human gate** | **Deploy** approved agent bundles, prompt updates, and instrumentation changes; **reject** or **defer** proposals; **append** an entry to **`BUILD_LOG.md`** in the deployable tree. | Bypass recorded tests or rollback expectations defined in policy when those are required for accept. |

**Rule:** only the **human gate** moves **authoritative** behavior from “proposal” to “live.” Everything else produces **data or documents**.

## Build log (accepted suggestions)

Every **accepted** improvement must leave an **append-only** record in **`BUILD_LOG.md`** at the root of the codebase or agent package being deployed. That file is part of the **generated / merged output** of the acceptance step—not optional documentation. Format, fields, and template: [`build-log.md`](./build-log.md).

## Control guardrails

- **No auto-apply** — the proposer and evaluator never promote changes to production; humans do.  
- **Anti-thrash** — single pending ticket, merge updates, and cooldowns as in **Error and anti-thrash policy** below.  
- **Cooldown** — after reject or N failed validation attempts, pause scheduled proposer runs until cooldown elapses.  
- **Allowlisted actuator types** — tickets classify proposals (e.g. prompt-only, agent code, observability-only). **Out-of-band** changes (credentials, billing, infra) are **out of scope** for the proposer; reject at review if they appear.  
- **Blast radius** — prefer **small, reversible** changes; tickets must state **rollback** (revert to previous agent version / prompt hash) and **what breaks** if misapplied.  
- **Verification before accept** — policy-level: no accept without **defined checks** (e.g. tests on agent package, smoke on golden set) passing in the environment operators trust.  
- **Secrets and exfiltration** — proposals must not embed or request secrets; runtime must not log secret-bearing content into sensors.  
- **Kill switch** — operators can **disable** scheduled evaluator and/or proposer without redeploying the scanner runtime.  
- **Priority enforcement** — if a ticket would trade a higher-priority goal for a lower one, the human gate treats it as **out of policy** unless explicitly overridden with documented rationale.

## Control loops

- **Fast loop (online):** each scan job drives the runtime and **writes sensors** only. Spec: [`agentic-subsystem.md`](./agentic-subsystem.md).  
- **Slow loop (scheduled):** evaluator → error package → proposer → **pending ticket**.

## Autopilot analogy (software flight control)

Aerospace **autopilot** is the organizing metaphor: **layered control**, **hard limits**, **clear modes**, and **human override**—not a claim that the LLM is a linear transfer function.

| Autopilot concept | This system |
|-------------------|-------------|
| **Flight control computer (FCC)** | **Host runtime** — job orchestration, loads one **agent package** version, calls the LLM API, enforces caps and secrets, emits sensors. |
| **Control laws** | **Agent package** (prompts, chunking, analysis behavior) — the stable mapping from “per-job state” to outputs, versioned and human-approved. |
| **Inner loop** | **Fast loop** — ingest → chunk → analyze → sink per job; tight regulation of that pipeline. |
| **Outer loop / flight director** | **Evaluator** — compares measured behavior to the **reference** and **goal priority**; produces the **error package**. |
| **Autopilot command path** | **Proposer** — turns error + context into **stick inputs** as text: a single **improvement ticket**, not live mutation. |
| **Envelope protection** | **Control guardrails** and **goal priority** — safety, integrity, and correctness bound what may be suggested or accepted. |
| **Actuator limits / rate limits** | Token caps, job rate, **single pending ticket**, **cooldowns** — anti-windup / anti-pilot-induced oscillation. |
| **Gain scheduling** | **Policy as a function of state** (e.g. cost high → smaller chunks or cheaper path) — implemented as **versioned config** in host and/or package, not ad hoc in one prompt. |
| **AP disconnect / manual** | **Human gate** — reject, defer, or **accept** a new law revision (deployed package). Nothing applies until then. |

**Annunciation:** logs and tickets should record **active agent package version**, **mode** (if used; see [`agentic-subsystem.md` § Operating modes](./agentic-subsystem.md#operating-modes-autopilot-analogy)), and **slow-loop** state (e.g. pending ticket id) so operators know what is “flying the airplane.”

## Error and anti-thrash policy

- **Error** = structured **gap** between reference and measured state (often **multiple deficits**, not one scalar).  
- **Single pending improvement:** if a ticket is already pending, **do not** open a second parallel proposal; **update the same ticket** with the latest error and evidence, or **wait** until the human resolves it.  
- **Cooldowns:** after rejection or repeated failure, backoff before another proposal cycle to limit oscillation.

## Sensors (categories)

Concrete metrics are defined at implementation time; this doc only fixes **classes of signal**:

- **Pipeline health** — success/fail, stage, latency, retries.  
- **Scanner outcome proxies** — yield, empty results, duplication vs history; human labels when available.  
- **Cost / capacity** — tokens, limits, model identity.  
- **Agent package identity** — version or content hash of the loaded bundle.  
- **Quality gates** — tests / smoke runs on that bundle.  
- **Model-call reliability** — refusals, parse or tool errors, truncation.  
- **Provenance** — repo, commit, scan scope for reproducibility.  

Optional later: **sensor policy** (what to sample or log more heavily).

## Actuators

Tickets may propose changes to **prompts**, **agent logic**, **chunking heuristics**, **observability** (new events/metrics), or **documentation** — always as **reviewable packages**. The actuator in the loop is **proposal**, not silent mutation.

## Transfer functions / Laplace note

Classical **Laplace-domain** models assume **linear time-invariant** dynamics; an LLM-plus-human plant is not LTI. Use control vocabulary (**reference, error, feedback, damping, anti-windup**) for **policy and clarity**; formal \(G(s)\)/\(H(s)\) analysis is optional unless a separate quantitative model is introduced. For how this maps to software roles, see **Autopilot analogy** above.

## Assumptions and risks

Self-modifying prompts are **high impact**; **human review** and **versioned agent packages** mitigate that. **Input and model shift** may require revisiting reference and golden sets. **Access control** matters for who can run evaluator → proposer and what code appears in tickets.

## Out of scope (this document)

UI, cron syntax, schemas, sandboxes, and detailed numeric acceptance criteria — covered in lower-level specs when needed. **Agentic** stages, prompts, and chunking contracts live in [`agentic-subsystem.md`](./agentic-subsystem.md).
