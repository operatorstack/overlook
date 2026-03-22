import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import {
  createImplementationTicket,
  getDefaultAgentPipelineTicketContent,
  getTicket,
  listImplementationTickets,
} from "../tickets/memoryTicketStore.js";
import type { ImplementationTicketKind } from "../tickets/types.js";

export const ticketsRouter = Router();

type CreateBody = {
  kind?: unknown;
  title?: unknown;
  body?: unknown;
};

function isKind(value: unknown): value is ImplementationTicketKind {
  return value === "agent_pipeline" || value === "custom";
}

ticketsRouter.post("/tickets", (req: Request, res: Response) => {
  const body = req.body as CreateBody;
  const kind: ImplementationTicketKind = isKind(body.kind) ? body.kind : "agent_pipeline";

  let title: string;
  let bodyText: string;

  if (kind === "agent_pipeline") {
    const defaults = getDefaultAgentPipelineTicketContent();
    title =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim().slice(0, 500)
        : defaults.title;
    bodyText =
      typeof body.body === "string" && body.body.trim().length > 0
        ? body.body.trim().slice(0, 8000)
        : defaults.body;
  } else {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      res.status(400).json({ error: "title is required for custom tickets" });
      return;
    }
    title = body.title.trim().slice(0, 500);
    bodyText =
      typeof body.body === "string" ? body.body.trim().slice(0, 8000) : "";
  }

  const ticket = createImplementationTicket({
    ticketId: randomUUID(),
    kind,
    title,
    body: bodyText,
  });

  res.status(201).json({
    ticketId: ticket.ticketId,
    kind: ticket.kind,
    title: ticket.title,
    body: ticket.body,
    status: ticket.status,
    createdAt: ticket.createdAt,
  });
});

ticketsRouter.get("/tickets", (_req: Request, res: Response) => {
  const list = listImplementationTickets();
  res.json({
    count: list.length,
    tickets: list.map((t) => ({
      ticketId: t.ticketId,
      kind: t.kind,
      title: t.title,
      body: t.body,
      status: t.status,
      createdAt: t.createdAt,
    })),
  });
});

ticketsRouter.get("/tickets/:ticketId", (req: Request, res: Response) => {
  const ticketId = req.params.ticketId;
  if (typeof ticketId !== "string" || ticketId.length === 0) {
    res.status(400).json({ error: "ticketId is required" });
    return;
  }
  const ticket = getTicket(ticketId);
  if (ticket === undefined) {
    res.status(404).json({ error: "ticket not found" });
    return;
  }
  res.json({
    ticketId: ticket.ticketId,
    kind: ticket.kind,
    title: ticket.title,
    body: ticket.body,
    status: ticket.status,
    createdAt: ticket.createdAt,
  });
});
