export function parseNextTicketDraft(markdown: string): { title: string; body: string } | null {
  const titleMatch = markdown.match(/^Title:\s*(.+)$/m);
  if (titleMatch === null || titleMatch[1] === undefined) {
    return null;
  }
  const title = titleMatch[1].trim();
  if (title.length === 0) {
    return null;
  }
  const lines = markdown.split(/\r?\n/);
  let bodyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && /^Body:\s*/.test(line)) {
      bodyStart = i;
      break;
    }
  }
  if (bodyStart === -1) {
    return { title, body: "" };
  }
  const bodyLine = lines[bodyStart];
  if (bodyLine === undefined) {
    return { title, body: "" };
  }
  const firstLine = bodyLine.replace(/^Body:\s*/, "");
  const rest = lines.slice(bodyStart + 1).join("\n");
  const body = (firstLine + (rest.length > 0 ? "\n" + rest : "")).trim();
  return { title, body };
}
