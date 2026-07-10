import mqtt from "mqtt";
import { z } from "zod";
import { config } from "../config.js";
import { pool } from "../db/pool.js";

const readingSchema = z.object({
  machine_id: z.string().min(1).max(64),
  ts: z.string().datetime().optional(),
  kwh: z.number().nonnegative(),
  cost_thb: z.number().nonnegative(),
});

export function startMqttIngestion() {
  const client = mqtt.connect(config.mqttUrl);

  client.on("connect", () => {
    console.log(`mqtt connected ${config.mqttUrl}; subscribing ${config.mqttTopic}`);
    client.subscribe(config.mqttTopic, (error) => {
      if (error) console.error("mqtt subscribe failed", error);
    });
  });

  client.on("message", async (_topic, payload) => {
    try {
      const parsed = readingSchema.parse(JSON.parse(payload.toString("utf8")));
      await pool.query(
        `INSERT INTO energy_readings (machine_id, ts, kwh, cost_thb)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (machine_id, ts) DO UPDATE SET
           kwh = EXCLUDED.kwh,
           cost_thb = EXCLUDED.cost_thb,
           ingested_at = now()`,
        [parsed.machine_id, parsed.ts ? new Date(parsed.ts) : new Date(), parsed.kwh, parsed.cost_thb],
      );
    } catch (error) {
      console.error("invalid mqtt energy reading", error);
    }
  });

  client.on("error", (error) => {
    console.error("mqtt error", error);
  });

  return client;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startMqttIngestion();
}
