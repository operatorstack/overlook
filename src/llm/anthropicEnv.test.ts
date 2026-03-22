import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnthropicEnv } from "./anthropicEnv.js";

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
