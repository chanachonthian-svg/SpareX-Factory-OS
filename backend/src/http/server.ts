import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { pool } from "../db/pool.js";
import { getEnergyCost, getMachineStatus, getSparePartsAlerts, getTopEnergyConsumers } from "../tools/factoryTools.js";
import { runCopilotAgent } from "../llm/orchestrator.js";

const chatBodySchema = z.object({
  session_id: z.string().min(1).max(128).optional(),
  message: z.string().min(1).max(4000),
});

const periodQuerySchema = z.object({
  period: z.enum(["today", "7d", "30d"]).default("today"),
});

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: config.corsOrigin === "*" ? true : config.corsOrigin,
  });

  app.get("/health", async () => ({ ok: true, service: "sparex-factoryos-backend" }));

  app.get("/api/tools/energy-cost", async (req) => getEnergyCost(pool, periodQuerySchema.parse(req.query)));
  app.get("/api/tools/top-energy-consumers", async (req) => getTopEnergyConsumers(pool, req.query));
  app.get("/api/tools/machine-status/:machine_id", async (req) => getMachineStatus(pool, req.params));
  app.get("/api/tools/spare-parts-alerts", async () => getSparePartsAlerts(pool));

  app.post("/api/copilot/chat", async (req, reply) => {
    const body = chatBodySchema.parse(req.body);
    const sessionId = body.session_id || crypto.randomUUID();

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const emit = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    emit("session", { session_id: sessionId });
    try {
      await runCopilotAgent(pool, sessionId, body.message, emit);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Copilot failed";
      emit("error", { message });
    } finally {
      reply.raw.end();
    }
  });

  return app;
}
