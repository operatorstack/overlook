export type ImplementationTicketKind = "agent_pipeline" | "custom";

export type ImplementationTicket = {
  ticketId: string;
  kind: ImplementationTicketKind;
  title: string;
  body: string;
  status: "open";
  createdAt: string;
};
