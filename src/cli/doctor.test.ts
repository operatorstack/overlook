import { describe, expect, it } from "vitest";
import { currentNodeMajor, minNodeMajorFromEngines, nodeVersionOk } from "./doctor.js";

describe("minNodeMajorFromEngines", () => {
  it("parses >=N", () => {
    expect(minNodeMajorFromEngines(">=20")).toBe(20);
    expect(minNodeMajorFromEngines(">= 18")).toBe(18);
  });

  it("falls back to first integer", () => {
    expect(minNodeMajorFromEngines("20.x")).toBe(20);
  });

  it("returns null for empty or unknown", () => {
    expect(minNodeMajorFromEngines(undefined)).toBeNull();
    expect(minNodeMajorFromEngines("")).toBeNull();
  });
});

describe("currentNodeMajor", () => {
  it("reads major from semver string", () => {
    expect(currentNodeMajor("22.13.0")).toBe(22);
    expect(currentNodeMajor("20")).toBe(20);
  });
});

describe("nodeVersionOk", () => {
  it("passes when no engines constraint", () => {
    expect(nodeVersionOk("18.0.0", undefined)).toBe(true);
  });

  it("compares against >= from engines", () => {
    expect(nodeVersionOk("20.0.0", ">=20")).toBe(true);
    expect(nodeVersionOk("19.9.0", ">=20")).toBe(false);
  });
});
