import { randomUUID } from "node:crypto";
import { completeAnthropicUserMessage } from "../llm/anthropicMessages.js";
import { getAnthropicEnv, resolveAnthropicModel } from "../llm/anthropicEnv.js";
import type { ReviewUnit, ScanFinding } from "./types.js";

const MAX_UNITS_IN_PROMPT = 14;
const MAX_UNIT_CHARS_IN_PROMPT = 3200;
const MAX_USER_PROMPT_CHARS = 120_000;
const MAX_OUTPUT_TOKENS = 8192;

const SYSTEM_PROMPT = `You are a technical research scanner. Your job is to surface things a curious engineer would find genuinely interesting, surprising, or worth writing about — the kind of observation that makes someone say "huh, that's clever" or "I didn't know you could do that."

You are NOT a linter, security scanner, or code reviewer. Skip all of the following:
- Generic security warnings (permissions, secrets handling, token scoping)
- Style or lint issues (naming, formatting, missing types)
- Obvious best-practice violations any junior dev would catch
- Boilerplate observations ("this file exports a function")
- Standard dependency or config concerns

What DOES count as a finding:
- Unusual or surprising architecture decisions and why they might exist
- Clever patterns, idioms, or techniques worth learning from
- Non-obvious tradeoffs the author made (and what they reveal about constraints)
- Subtle interactions between components that aren't apparent at first glance
- Creative solutions to hard problems
- Things that hint at the codebase's "philosophy" or design lineage

Confidence calibration:
- high: "I'd share this in a team channel — people would find it interesting"
- medium: "Worth a closer look, there's something going on here"
- low: "Mildly curious, might be interesting in context"

Prefer FEWER, BETTER findings. An empty array [] is the correct answer if nothing is genuinely novel. Three strong observations beat ten mediocre ones.

Respond with ONLY a JSON array (no markdown fences, no commentary). Each element must be an object with:
- title: short string (framed as what makes it interesting, not what's wrong)
- angle: string (the novel or curious technical angle — what makes this worth noticing)
- evidencePath: string (must match one of the input paths exactly)
- confidence: exactly one of "low", "medium", "high"
- detail: string (1-3 sentences, grounded in the excerpt, explaining why this is interesting)

Do not invent file paths.`;

export type AnalyzeReviewUnitsResult =
  | { ok: true; findings: ScanFinding[]; skipped: boolean; skipReason?: string; modelUsed?: string }
  | { ok: false; error: string };

function isConfidence(value: unknown): value is ScanFinding["confidence"] {
  return value === "low" || value === "medium" || value === "high";
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const inner = m?.[1];
  if (inner !== undefined && inner.length > 0) {
    return inner.trim();
  }
  return t;
}

export function parseFindingsJson(text: string, allowedPaths: Set<string>): ScanFinding[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(text));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) {
    return null;
  }
  const out: ScanFinding[] = [];
  for (const item of parsed) {
    if (!isRecord(item)) {
      return null;
    }
    const title = item.title;
    const angle = item.angle;
    const evidencePath = item.evidencePath;
    const confidence = item.confidence;
    const detail = item.detail;
    if (
      typeof title !== "string" ||
      typeof angle !== "string" ||
      typeof evidencePath !== "string" ||
      typeof detail !== "string" ||
      !isConfidence(confidence)
    ) {
      return null;
    }
    if (!allowedPaths.has(evidencePath)) {
      return null;
    }
    out.push({
      findingId: randomUUID(),
      title: title.slice(0, 500),
      angle: angle.slice(0, 2000),
      evidencePath,
      confidence,
      detail: detail.slice(0, 8000),
    });
  }
  return out;
}

function buildUserPrompt(units: ReviewUnit[], scanTruncated: boolean): string {
  const slice = units.slice(0, MAX_UNITS_IN_PROMPT);
  const lines: string[] = [];
  if (scanTruncated) {
    lines.push(
      "Note: the repository scan was truncated at a file cap; you only see a subset of files.\n",
    );
  }
  for (const u of slice) {
    const body =
      u.content.length > MAX_UNIT_CHARS_IN_PROMPT
        ? `${u.content.slice(0, MAX_UNIT_CHARS_IN_PROMPT)}…`
        : u.content;
    lines.push(`---\npath: ${u.path}\nlanguage: ${u.language}\n---\n${body}\n`);
  }
  let prompt = lines.join("\n");
  if (prompt.length > MAX_USER_PROMPT_CHARS) {
    prompt = prompt.slice(0, MAX_USER_PROMPT_CHARS) + "\n…[prompt truncated]";
  }
  return prompt;
}

export async function analyzeReviewUnits(input: {
  reviewUnits: ReviewUnit[];
  reviewUnitScanTruncated: boolean;
}): Promise<AnalyzeReviewUnitsResult> {
  const env = getAnthropicEnv();
  if (!env.configured || env.apiKey === undefined) {
    return {
      ok: true,
      findings: [],
      skipped: true,
      skipReason: "ANTHROPIC_API_KEY not set",
    };
  }

  const allowedPaths = new Set(input.reviewUnits.map((u) => u.path));
  const user = buildUserPrompt(input.reviewUnits, input.reviewUnitScanTruncated);

  const model = resolveAnthropicModel();
  const completion = await completeAnthropicUserMessage({
    baseUrl: env.baseUrl,
    apiKey: env.apiKey,
    model,
    system: SYSTEM_PROMPT,
    user,
    maxTokens: MAX_OUTPUT_TOKENS,
  });

  if (!completion.ok) {
    return { ok: false, error: completion.error };
  }

  const findings = parseFindingsJson(completion.text, allowedPaths);
  if (findings === null) {
    return {
      ok: false,
      error: "Model output was not a valid JSON array of findings with allowed evidence paths",
    };
  }

  return { ok: true, findings, skipped: false, modelUsed: model };
}
