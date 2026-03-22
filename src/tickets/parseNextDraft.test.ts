import { describe, expect, it } from "vitest";
import { parseNextTicketDraft } from "./parseNextDraft.js";

describe("parseNextTicketDraft", () => {
  it("returns null without Title line", () => {
    expect(parseNextTicketDraft("# Hello\n\nno title")).toBeNull();
  });

  it("parses Title and Body", () => {
    const md = `
# Next

Title: Ship chunker v1
Body:
First line
Second line
`;
    expect(parseNextTicketDraft(md)).toEqual({
      title: "Ship chunker v1",
      body: "First line\nSecond line",
    });
  });

  it("parses Title only", () => {
    expect(parseNextTicketDraft("Title: Quick fix")).toEqual({
      title: "Quick fix",
      body: "",
    });
  });

  it("parses Body on same line as Body:", () => {
    expect(parseNextTicketDraft("Title: T\nBody: inline note")).toEqual({
      title: "T",
      body: "inline note",
    });
  });
});
