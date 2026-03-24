import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeReviewUnits, parseFindingsJson } from "./analyzeReviewUnits.js";

describe("parseFindingsJson", () => {
  it("accepts a valid array with allowed paths", () => {
    const paths = new Set(["src/a.ts"]);
    const raw = `[{"title":"T","angle":"A","evidencePath":"src/a.ts","confidence":"high","detail":"D"}]`;
    const out = parseFindingsJson(raw, paths);
    expect(out).not.toBeNull();
    if (out === null) {
      return;
    }
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("T");
    expect(out[0].confidence).toBe("high");
    expect(typeof out[0].findingId).toBe("string");
    expect(out[0].findingId.length).toBeGreaterThan(0);
  });

  it("accepts empty array", () => {
    const out = parseFindingsJson("[]", new Set(["x"]));
    expect(out).toEqual([]);
  });

  it("rejects evidencePath not in allow list", () => {
    const out = parseFindingsJson(
      `[{"title":"T","angle":"A","evidencePath":"other.ts","confidence":"low","detail":"D"}]`,
      new Set(["src/a.ts"]),
    );
    expect(out).toBeNull();
  });

  it("strips a json markdown fence", () => {
    const paths = new Set(["p"]);
    const inner = JSON.stringify([
      {
        title: "x",
        angle: "a",
        evidencePath: "p",
        confidence: "medium",
        detail: "d",
      },
    ]);
    const raw = "```json\n" + inner + "\n```";
    const out = parseFindingsJson(raw, paths);
    expect(out).not.toBeNull();
    if (out === null) {
      return;
    }
    expect(out).toHaveLength(1);
  });
});

describe("analyzeReviewUnits", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("skips LLM when API key is not configured", async () => {
    const result = await analyzeReviewUnits({
      reviewUnits: [{ path: "a.ts", language: "typescript", content: "export const x = 1" }],
      reviewUnitScanTruncated: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.skipped).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.skipReason).toContain("ANTHROPIC_API_KEY");
  });

  it("calls Anthropic when configured and stores parsed findings with modelUsed", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const payload = {
      content: [
        {
          type: "text",
          text: `[{"title":"Note","angle":"Style","evidencePath":"a.ts","confidence":"low","detail":"Short."}]`,
        },
      ],
    };
    globalThis.fetch = vi.fn(
      async (): Promise<Response> => new Response(JSON.stringify(payload), { status: 200 }),
    );

    const result = await analyzeReviewUnits({
      reviewUnits: [{ path: "a.ts", language: "typescript", content: "const x = 1" }],
      reviewUnitScanTruncated: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.skipped).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].title).toBe("Note");
    expect(typeof result.modelUsed).toBe("string");
    expect(result.modelUsed!.length).toBeGreaterThan(0);
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});
