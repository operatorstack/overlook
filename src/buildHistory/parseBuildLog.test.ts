import { describe, expect, it } from "vitest";
import { parseBuildLogMarkdown } from "./parseBuildLog.js";

describe("parseBuildLogMarkdown", () => {
  it("returns empty when no build entries", () => {
    expect(parseBuildLogMarkdown("# Build log\n\nNo entries.")).toEqual([]);
  });

  it("parses one entry and lists newest first when multiple", () => {
    const md = `
# Build log

---

## Build 2026-01-01T00:00:00Z — ticket \`a\`

**Accepted (UTC):** 2026-01-01T00:00:00Z
**Ticket:** \`a\`
**Summary:** First

---

## Build 2026-02-01T00:00:00Z — ticket \`b\`

**Accepted (UTC):** 2026-02-01T00:00:00Z
**Ticket:** \`b\`
**Summary:** Second
`;
    const entries = parseBuildLogMarkdown(md);
    expect(entries).toHaveLength(2);
    expect(entries[0].ticket).toBe("`b`");
    expect(entries[0].summary).toBe("Second");
    expect(entries[1].ticket).toBe("`a`");
  });
});
