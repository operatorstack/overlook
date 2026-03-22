import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { clearImplementationTicketsForTests } from "../tickets/memoryTicketStore.js";

describe("implementation tickets", () => {
  const app = createApp();

  beforeEach(() => {
    clearImplementationTicketsForTests();
  });

  it("POST /v1/tickets creates agent_pipeline with defaults", async () => {
    const res = await request(app).post("/v1/tickets").send({}).expect(201);
    expect(res.body.kind).toBe("agent_pipeline");
    expect(res.body.title).toContain("agent pipeline");
    expect(res.body.status).toBe("open");
    expect(typeof res.body.ticketId).toBe("string");
  });

  it("POST /v1/tickets custom requires title", async () => {
    await request(app).post("/v1/tickets").send({ kind: "custom" }).expect(400);
  });

  it("GET /v1/tickets lists tickets", async () => {
    await request(app).post("/v1/tickets").send({}).expect(201);
    const res = await request(app).get("/v1/tickets").expect(200);
    expect(res.body.count).toBe(1);
    expect(res.body.tickets).toHaveLength(1);
  });
});
