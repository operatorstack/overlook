export type BuildLogEntry = {
  titleLine: string;
  body: string;
  ticket: string | null;
  acceptedAt: string | null;
  summary: string | null;
  raw: string;
};

function takeLineValue(body: string, label: string): string | null {
  const prefix = `**${label}:**`;
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (t.startsWith(prefix)) {
      return t.slice(prefix.length).trim();
    }
  }
  return null;
}

function parseEntryBlock(block: string): BuildLogEntry {
  const trimmed = block.trim();
  const firstNl = trimmed.indexOf("\n");
  const titleLine = firstNl === -1 ? trimmed : trimmed.slice(0, firstNl).trim();
  const body = firstNl === -1 ? "" : trimmed.slice(firstNl + 1).trim();
  return {
    titleLine,
    body,
    ticket: takeLineValue(body, "Ticket"),
    acceptedAt: takeLineValue(body, "Accepted (UTC)"),
    summary: takeLineValue(body, "Summary"),
    raw: trimmed,
  };
}

export function parseBuildLogMarkdown(content: string): BuildLogEntry[] {
  const segments = content.split(/\n(?=## Build )/);
  const blocks = segments.filter((s) => s.trimStart().startsWith("## Build "));
  const chronological = blocks.map((b) => parseEntryBlock(b));
  return chronological.slice().reverse();
}
