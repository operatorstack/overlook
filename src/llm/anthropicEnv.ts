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

export function getAnthropicModel(): string {
  const m = pick(process.env.ANTHROPIC_MODEL);
  if (m !== undefined) {
    return m;
  }
  return "claude-3-5-haiku-20241022";
}
