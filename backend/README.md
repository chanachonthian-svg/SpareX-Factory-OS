# SpareX Factory OS Backend

Backend for the SpareX Factory OS AI Factory Copilot.

## Stack

- Node.js + TypeScript + Fastify
- PostgreSQL with TimescaleDB for time-series energy readings
- Anthropic Claude tool-use orchestration (`claude-sonnet-5` by default)
- MQTT ingestion for IoT meter data

## Architecture

The code keeps four layers separate:

- Data layer: migrations, Timescale hypertable, seed, MQTT ingestion
- Tool layer: deterministic service functions in `src/tools`
- LLM orchestrator: `POST /api/copilot/chat` with Claude tool use and SSE
- Guardrails: Thai system prompt in `src/llm/anthropic.ts`

## Setup

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run migrate
npm run seed
npm run dev
```

API will listen on `http://localhost:3004`.

## Environment

```env
DATABASE_URL=postgres://factoryos:factoryos@localhost:5432/factoryos
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-5
MQTT_URL=mqtt://localhost:1883
MQTT_TOPIC=factoryos/meters/+/energy
```

## Endpoints

- `GET /health`
- `GET /api/tools/energy-cost?period=today`
- `GET /api/tools/top-energy-consumers?limit=5`
- `GET /api/tools/machine-status/:machine_id`
- `GET /api/tools/spare-parts-alerts`
- `POST /api/copilot/chat` streams Server-Sent Events

Example chat:

```bash
curl -N http://localhost:3004/api/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id":"demo-1","message":"ต้นทุนพลังงานวันนี้เท่าไหร่"}'
```

## MQTT Ingestion

Start the subscriber:

```bash
npm run mqtt
```

Publish a reading:

```bash
mosquitto_pub -h localhost -t factoryos/meters/CMP-03/energy -m \
'{"machine_id":"CMP-03","ts":"2026-07-08T14:00:00.000Z","kwh":72.4,"cost_thb":351.14}'
```

The subscriber upserts into `energy_readings(machine_id, ts, kwh, cost_thb)`.

## Tests

Unit tests do not require Docker:

```bash
npm test
```

Integration test requires TimescaleDB from Docker and uses seeded data:

```bash
docker compose up -d
npm run migrate
RUN_INTEGRATION=1 npm run test:integration
```

The integration test mocks Claude responses but forces the agentic loop to call `get_energy_cost({ period: "today" })` against the seeded database, then checks that the final answer includes the real seeded cost and a `ข้อมูล ณ ...` timestamp.
