import { randomUUID } from "node:crypto";
import { completeAnthropicUserMessage } from "../llm/anthropicMessages.js";
import { getAnthropicEnv, getAnthropicModel } from "../llm/anthropicEnv.js";
import type { ReviewUnit, ScanFinding } from "./types.js";

const MAX_UNITS_IN_PROMPT = 14;
const MAX_UNIT_CHARS_IN_PROMPT = 3200;
const MAX_USER_PROMPT_CHARS = 120_000;
const MAX_OUTPUT_TOKENS = 8192;

const SYSTEM_PROMPT = `You are assisting an automated code scan. Respond with ONLY a JSON array (no markdown fences, no commentary). Each element must be an object with:
- title: short string
- angle: string (novelty or technical angle)
- evidencePath: string (must match one of the input paths exactly)
- confidence: exactly one of "low", "medium", "high"
- detail: string (1-3 sentences, grounded in the excerpt)

Use an empty array [] if there is nothing worth flagging. Do not invent file paths.`;

export type AnalyzeReviewUnitsResult =
  | { ok: true; findings: ScanFinding[]; skipped: boolean; skipReason?: string }
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

  const model = getAnthropicModel();
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

  return { ok: true, findings, skipped: false };
}
