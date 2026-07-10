import "dotenv/config";

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3004),
  databaseUrl: process.env.DATABASE_URL || "postgres://factoryos:factoryos@localhost:5432/factoryos",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  mqttUrl: process.env.MQTT_URL || "mqtt://localhost:1883",
  mqttTopic: process.env.MQTT_TOPIC || "factoryos/meters/+/energy",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};
