import { getAgentModelForMode, type OperatingMode } from "../agent/config.js";

const DEFAULT_BASE = "https://api.anthropic.com";

function pick(value: string | undefined): string | undefined {
  const t = value?.trim();
  if (t === undefined || t.length === 0) {
    return undefined;
  }
  return t;
}

export type AnthropicEnvSnapshot = {
  baseUrl: string;
  apiKey: string | undefined;
  configured: boolean;
};

export function getAnthropicEnv(): AnthropicEnvSnapshot {
  const fromUrl = pick(process.env.ANTHROPIC_URL);
  const fromBase = pick(process.env.ANTHROPIC_BASE_URL);
  const chosen = fromUrl ?? fromBase;
  const baseUrl = (chosen ?? DEFAULT_BASE).replace(/\/$/, "");
  const apiKey = pick(process.env.ANTHROPIC_API_KEY);
  return {
    baseUrl,
    apiKey,
    configured: apiKey !== undefined,
  };
}

/**
 * Resolve the model ID for an LLM call.
 * Priority: ANTHROPIC_MODEL env override > agent package config for the mode > agent default.
 * Spec: docs/agentic-subsystem.md § Prompting & LLM call boundaries.
 */
export function resolveAnthropicModel(mode?: OperatingMode): string {
  const envOverride = pick(process.env.ANTHROPIC_MODEL);
  if (envOverride !== undefined) {
    return envOverride;
  }
  return getAgentModelForMode(mode);
}
