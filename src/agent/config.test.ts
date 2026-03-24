import { describe, expect, it } from "vitest";
import {
  getAgentConfig,
  getAgentModelForMode,
  isOperatingMode,
} from "./config.js";

describe("getAgentConfig", () => {
  it("returns a config with a defaultModel and all three modes", () => {
    const cfg = getAgentConfig();
    expect(cfg.defaultModel.length).toBeGreaterThan(0);
    expect(cfg.modeModels.discovery.modelId.length).toBeGreaterThan(0);
    expect(cfg.modeModels.triage.modelId.length).toBeGreaterThan(0);
    expect(cfg.modeModels["deep-dive"].modelId.length).toBeGreaterThan(0);
  });
});

describe("isOperatingMode", () => {
  it("accepts valid modes", () => {
    expect(isOperatingMode("discovery")).toBe(true);
    expect(isOperatingMode("triage")).toBe(true);
    expect(isOperatingMode("deep-dive")).toBe(true);
  });

  it("rejects invalid strings", () => {
    expect(isOperatingMode("turbo")).toBe(false);
    expect(isOperatingMode("")).toBe(false);
  });
});

describe("getAgentModelForMode", () => {
  it("returns defaultModel when no mode given", () => {
    const cfg = getAgentConfig();
    expect(getAgentModelForMode()).toBe(cfg.defaultModel);
  });

  it("returns mode-specific model for deep-dive", () => {
    const cfg = getAgentConfig();
    expect(getAgentModelForMode("deep-dive")).toBe(cfg.modeModels["deep-dive"].modelId);
  });

  it("returns mode-specific model for discovery", () => {
    const cfg = getAgentConfig();
    expect(getAgentModelForMode("discovery")).toBe(cfg.modeModels.discovery.modelId);
  });
});
