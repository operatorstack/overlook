import type { ImplementationTicket, ImplementationTicketKind } from "./types.js";

const tickets = new Map<string, ImplementationTicket>();

const DEFAULT_AGENT_TITLE = "Implement agent pipeline (ingest → chunk → analyze → sink)";
const DEFAULT_AGENT_BODY =
  "Host runs ingest, chunk, and optional Anthropic analyze; terminal jobs are snapshotted as JSON under data/job-sink (or OVERLOOK_JOB_SINK_DIR) and reloaded on startup. Next: DB or operator sink, agent package split, richer analysis per server/docs/agentic-subsystem.md.";

export function createImplementationTicket(input: {
  ticketId: string;
  kind: ImplementationTicketKind;
  title: string;
  body: string;
}): ImplementationTicket {
  const ticket: ImplementationTicket = {
    ticketId: input.ticketId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  tickets.set(ticket.ticketId, ticket);
  return ticket;
}

export function getDefaultAgentPipelineTicketContent(): { title: string; body: string } {
  return { title: DEFAULT_AGENT_TITLE, body: DEFAULT_AGENT_BODY };
}

export function getTicket(ticketId: string): ImplementationTicket | undefined {
  return tickets.get(ticketId);
}

export function listImplementationTickets(): ImplementationTicket[] {
  return [...tickets.values()].sort((a, b) => {
    if (a.createdAt < b.createdAt) {
      return 1;
    }
    if (a.createdAt > b.createdAt) {
      return -1;
    }
    return 0;
  });
}

export function clearImplementationTicketsForTests(): void {
  tickets.clear();
}
