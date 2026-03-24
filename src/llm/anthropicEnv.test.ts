import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnthropicEnv, resolveAnthropicModel } from "./anthropicEnv.js";
import { getAgentConfig } from "../agent/config.js";

describe("getAnthropicEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults base URL when no env set", () => {
    vi.stubEnv("ANTHROPIC_URL", "");
    vi.stubEnv("ANTHROPIC_BASE_URL", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const c = getAnthropicEnv();
    expect(c.baseUrl).toBe("https://api.anthropic.com");
    expect(c.configured).toBe(false);
  });

  it("prefers ANTHROPIC_URL over ANTHROPIC_BASE_URL", () => {
    vi.stubEnv("ANTHROPIC_URL", "https://proxy.example/v1/");
    vi.stubEnv("ANTHROPIC_BASE_URL", "https://ignored.example");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const c = getAnthropicEnv();
    expect(c.baseUrl).toBe("https://proxy.example/v1");
    expect(c.configured).toBe(true);
  });

  it("uses ANTHROPIC_BASE_URL when ANTHROPIC_URL empty", () => {
    vi.stubEnv("ANTHROPIC_URL", "");
    vi.stubEnv("ANTHROPIC_BASE_URL", "https://api.anthropic.com");
    const c = getAnthropicEnv();
    expect(c.baseUrl).toBe("https://api.anthropic.com");
  });
});

describe("resolveAnthropicModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns agent config default when no env override and no mode", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    const cfg = getAgentConfig();
    expect(resolveAnthropicModel()).toBe(cfg.defaultModel);
  });

  it("returns agent config mode model when no env override", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    const cfg = getAgentConfig();
    expect(resolveAnthropicModel("deep-dive")).toBe(cfg.modeModels["deep-dive"].modelId);
  });

  it("env override wins over agent config default", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "claude-override");
    expect(resolveAnthropicModel()).toBe("claude-override");
  });

  it("env override wins over agent config mode model", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "claude-override");
    expect(resolveAnthropicModel("deep-dive")).toBe("claude-override");
  });

  it("trims whitespace from env override", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "  claude-test  ");
    expect(resolveAnthropicModel()).toBe("claude-test");
  });
});
