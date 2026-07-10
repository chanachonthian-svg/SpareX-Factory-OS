CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS machines (
  machine_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'idle', 'maintenance', 'offline', 'alarm')),
  runtime_hours NUMERIC(12, 2) NOT NULL DEFAULT 0,
  installed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS energy_readings (
  machine_id TEXT NOT NULL REFERENCES machines(machine_id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL,
  kwh NUMERIC(14, 4) NOT NULL CHECK (kwh >= 0),
  cost_thb NUMERIC(14, 2) NOT NULL CHECK (cost_thb >= 0),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (machine_id, ts)
);

SELECT create_hypertable('energy_readings', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS energy_readings_ts_idx ON energy_readings (ts DESC);
CREATE INDEX IF NOT EXISTS energy_readings_machine_ts_idx ON energy_readings (machine_id, ts DESC);

CREATE TABLE IF NOT EXISTS spare_parts (
  part_id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES machines(machine_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL CHECK (stock >= 0),
  min_stock INTEGER NOT NULL CHECK (min_stock >= 0),
  unit_cost_thb NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id BIGSERIAL PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES machines(machine_id) ON DELETE CASCADE,
  performed_at TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL,
  notes TEXT NOT NULL,
  downtime_minutes INTEGER NOT NULL DEFAULT 0,
  cost_thb NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS maintenance_logs_machine_time_idx ON maintenance_logs (machine_id, performed_at DESC);

CREATE TABLE IF NOT EXISTS copilot_sessions (
  session_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copilot_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES copilot_sessions(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS copilot_messages_session_idx ON copilot_messages (session_id, id);
