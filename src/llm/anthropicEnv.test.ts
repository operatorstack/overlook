import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnthropicEnv, getAnthropicModel } from "./anthropicEnv.js";

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

describe("getAnthropicModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults when ANTHROPIC_MODEL unset", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    expect(getAnthropicModel()).toBe("claude-3-5-haiku-20241022");
  });

  it("uses trimmed ANTHROPIC_MODEL when set", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "  claude-test  ");
    expect(getAnthropicModel()).toBe("claude-test");
  });
});
