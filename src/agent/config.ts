/**
 * Agent package configuration — versioned, reviewable source of truth for
 * analysis behavior the agent *wants*. Host env vars may override at runtime.
 *
 * Spec: docs/agentic-subsystem.md § Prompting & LLM call boundaries,
 *       docs/agentic-subsystem.md § Operating modes,
 *       docs/systems.md § Gain scheduling.
 */

export type OperatingMode = "discovery" | "triage" | "deep-dive";

export type ModeModelConfig = {
  readonly modelId: string;
};

export type AgentConfig = {
  readonly defaultModel: string;
  readonly modeModels: Readonly<Record<OperatingMode, ModeModelConfig>>;
};

const AGENT_CONFIG: AgentConfig = {
  defaultModel: "claude-haiku-4-5-20251001",
  modeModels: {
    discovery: { modelId: "claude-haiku-4-5-20251001" },
    triage: { modelId: "claude-haiku-4-5-20251001" },
    "deep-dive": { modelId: "claude-sonnet-4-20250514" },
  },
};

export function getAgentConfig(): AgentConfig {
  return AGENT_CONFIG;
}

export function isOperatingMode(value: string): value is OperatingMode {
  return value === "discovery" || value === "triage" || value === "deep-dive";
}

/**
 * Resolve the model to use for a given operating mode (or the default).
 * Does NOT check the host env override — that layer lives in anthropicEnv.ts.
 */
export function getAgentModelForMode(mode?: OperatingMode): string {
  if (mode !== undefined) {
    return AGENT_CONFIG.modeModels[mode].modelId;
  }
  return AGENT_CONFIG.defaultModel;
}
