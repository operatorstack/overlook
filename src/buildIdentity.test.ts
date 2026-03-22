import { describe, expect, it } from "vitest";
import { getBuildIdentity } from "./buildIdentity.js";

describe("getBuildIdentity", () => {
  it("returns stable shape for this package", () => {
    const b = getBuildIdentity();
    expect(b.productName).toBe("Overlook server");
    expect(b.packageVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(b.displayLine).toContain("Overlook server");
    expect(b.displayLine).toContain(b.packageVersion);
    expect(b.audienceNote.length).toBeGreaterThan(20);
    expect(b.nodeVersion).toMatch(/^v\d+/);
    expect(["development", "production"]).toContain(b.environment);
  });
});
