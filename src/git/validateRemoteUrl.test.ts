import { describe, expect, it } from "vitest";
import { normalizeRef, validateGitRemoteUrl } from "./validateRemoteUrl.js";

describe("validateGitRemoteUrl", () => {
  it("accepts https URL", () => {
    expect(validateGitRemoteUrl("https://github.com/org/repo.git")).toEqual({ ok: true });
  });

  it("accepts ssh remote", () => {
    expect(validateGitRemoteUrl("git@github.com:org/repo.git")).toEqual({ ok: true });
  });

  it("rejects empty", () => {
    const r = validateGitRemoteUrl("  ");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("gitUrl is empty");
    }
  });

  it("rejects embedded user:pass in URL", () => {
    const r = validateGitRemoteUrl("https://user:secret@github.com/org/repo.git");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("gitUrl must not embed credentials");
    }
  });
});

describe("normalizeRef", () => {
  it("returns undefined for empty", () => {
    expect(normalizeRef("")).toBeUndefined();
    expect(normalizeRef(undefined)).toBeUndefined();
  });

  it("trims and returns ref", () => {
    expect(normalizeRef("  main  ")).toBe("main");
  });
});
