import type { Queryable } from "../db/pool.js";
import {
  getEnergyCostSchema,
  getMachineStatusSchema,
  getTopEnergyConsumersSchema,
  type EnergyConsumer,
  type EnergyCostData,
  type FactoryToolName,
  type MachineStatusData,
  type SparePartAlert,
  type ToolResult,
} from "./types.js";

function num(value: unknown) {
  return Number(value ?? 0);
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function periodSql(period: "today" | "7d" | "30d") {
  if (period === "today") return "date_trunc('day', now())";
  if (period === "7d") return "now() - interval '7 days'";
  return "now() - interval '30 days'";
}

async function dataAsOf(db: Queryable) {
  const res = await db.query("SELECT COALESCE(MAX(ts), now()) AS data_as_of FROM energy_readings");
  return iso(res.rows[0]?.data_as_of);
}

export async function getEnergyCost(db: Queryable, input: unknown): Promise<ToolResult<EnergyCostData>> {
  const args = getEnergyCostSchema.parse(input);
  const since = periodSql(args.period);
  const [summary, daily, asOf] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(kwh), 0) AS total_kwh, COALESCE(SUM(cost_thb), 0) AS total_cost_thb FROM energy_readings WHERE ts >= ${since}`),
    db.query(
      `SELECT time_bucket('1 day', ts) AS day, SUM(kwh) AS kwh, SUM(cost_thb) AS cost_thb
       FROM energy_readings
       WHERE ts >= ${since}
       GROUP BY day
       ORDER BY day`,
    ),
    dataAsOf(db),
  ]);

  return {
    data_as_of: asOf,
    data: {
      period: args.period,
      total_kwh: num(summary.rows[0]?.total_kwh),
      total_cost_thb: num(summary.rows[0]?.total_cost_thb),
      daily_breakdown: daily.rows.map((row) => ({
        date: iso(row.day).slice(0, 10),
        kwh: num(row.kwh),
        cost_thb: num(row.cost_thb),
      })),
    },
  };
}

export async function getTopEnergyConsumers(db: Queryable, input: unknown): Promise<ToolResult<EnergyConsumer[]>> {
  const args = getTopEnergyConsumersSchema.parse(input);
  const [res, asOf] = await Promise.all([
    db.query(
      `WITH machine_energy AS (
         SELECT machine_id, SUM(kwh) AS kwh, SUM(cost_thb) AS cost_thb
         FROM energy_readings
         WHERE ts >= now() - interval '30 days'
         GROUP BY machine_id
       ), total AS (
         SELECT COALESCE(SUM(kwh), 0) AS total_kwh FROM machine_energy
       )
       SELECT m.machine_id, m.name AS machine_name, m.area, e.kwh, e.cost_thb,
              CASE WHEN total.total_kwh = 0 THEN 0 ELSE e.kwh / total.total_kwh * 100 END AS kwh_share_pct
       FROM machine_energy e
       JOIN machines m ON m.machine_id = e.machine_id
       CROSS JOIN total
       ORDER BY e.kwh DESC
       LIMIT $1`,
      [args.limit],
    ),
    dataAsOf(db),
  ]);

  return {
    data_as_of: asOf,
    data: res.rows.map((row) => ({
      machine_id: row.machine_id,
      machine_name: row.machine_name,
      area: row.area,
      kwh: num(row.kwh),
      cost_thb: num(row.cost_thb),
      kwh_share_pct: Number(num(row.kwh_share_pct).toFixed(2)),
    })),
  };
}

export async function getMachineStatus(db: Queryable, input: unknown): Promise<ToolResult<MachineStatusData | null>> {
  const args = getMachineStatusSchema.parse(input);
  const [machine, maintenance, asOf] = await Promise.all([
    db.query("SELECT machine_id, name, area, type, status, runtime_hours FROM machines WHERE machine_id = $1", [args.machine_id]),
    db.query(
      `SELECT performed_at, kind, notes, downtime_minutes, cost_thb
       FROM maintenance_logs
       WHERE machine_id = $1
       ORDER BY performed_at DESC
       LIMIT 1`,
      [args.machine_id],
    ),
    dataAsOf(db),
  ]);

  if (!machine.rowCount) return { data_as_of: asOf, data: null };
  const row = machine.rows[0];
  const last = maintenance.rows[0];

  return {
    data_as_of: asOf,
    data: {
      machine_id: row.machine_id,
      machine_name: row.name,
      area: row.area,
      type: row.type,
      status: row.status,
      runtime_hours: num(row.runtime_hours),
      last_maintenance: last
        ? {
            performed_at: iso(last.performed_at),
            kind: last.kind,
            notes: last.notes,
            downtime_minutes: num(last.downtime_minutes),
            cost_thb: num(last.cost_thb),
          }
        : null,
    },
  };
}

export async function getSparePartsAlerts(db: Queryable): Promise<ToolResult<SparePartAlert[]>> {
  const [res, asOf] = await Promise.all([
    db.query(
      `SELECT p.part_id, p.name AS part_name, p.machine_id, m.name AS machine_name, p.stock, p.min_stock,
              GREATEST(p.min_stock - p.stock, 0) AS shortage
       FROM spare_parts p
       JOIN machines m ON m.machine_id = p.machine_id
       WHERE p.stock < p.min_stock
       ORDER BY shortage DESC, p.part_id`,
    ),
    dataAsOf(db),
  ]);

  return {
    data_as_of: asOf,
    data: res.rows.map((row) => ({
      part_id: row.part_id,
      part_name: row.part_name,
      machine_id: row.machine_id,
      machine_name: row.machine_name,
      stock: num(row.stock),
      min_stock: num(row.min_stock),
      shortage: num(row.shortage),
    })),
  };
}

export async function executeFactoryTool(db: Queryable, name: FactoryToolName, input: unknown) {
  if (name === "get_energy_cost") return getEnergyCost(db, input);
  if (name === "get_top_energy_consumers") return getTopEnergyConsumers(db, input);
  if (name === "get_machine_status") return getMachineStatus(db, input);
  if (name === "get_spare_parts_alerts") return getSparePartsAlerts(db);
  throw new Error(`Unknown tool: ${name}`);
}
