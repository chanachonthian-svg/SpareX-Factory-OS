import { pool, closePool } from "./pool.js";
import { migrate } from "./migrate.js";

const machines = [
  ["CMP-01", "Compressor #1", "Utilities", "air_compressor", "running", 18420],
  ["CMP-02", "Compressor #2", "Utilities", "air_compressor", "running", 17680],
  ["CMP-03", "Compressor #3", "Utilities", "air_compressor", "alarm", 19210],
  ["CHL-01", "Chiller #1", "Cooling", "chiller", "running", 22450],
  ["CHL-02", "Chiller #2", "Cooling", "chiller", "maintenance", 21820],
  ["PMP-203", "Pump P-203", "Chilled Water", "pump", "running", 9420],
  ["CNV-B1", "Line B Conveyor", "Packing", "conveyor", "idle", 11680],
  ["MIX-04", "Mixer #4", "Production", "mixer", "running", 8320],
  ["FAN-07", "Exhaust Fan #7", "Utilities", "fan", "running", 15440],
  ["ROB-02", "Robot Cell #2", "Assembly", "robot_cell", "offline", 6410],
] as const;

const baseKwh: Record<string, number> = {
  "CMP-01": 48,
  "CMP-02": 56,
  "CMP-03": 72,
  "CHL-01": 82,
  "CHL-02": 68,
  "PMP-203": 26,
  "CNV-B1": 18,
  "MIX-04": 34,
  "FAN-07": 14,
  "ROB-02": 11,
};

function readingFor(machineId: string, hourIndex: number, hour: number) {
  const peak = hour >= 9 && hour <= 22 ? 1.22 : 0.84;
  const wave = 1 + Math.sin(hourIndex / 7 + machineId.length) * 0.08;
  const alarmFactor = machineId === "CMP-03" && hourIndex > 24 * 25 ? 1.18 : 1;
  const kwh = Number((baseKwh[machineId] * peak * wave * alarmFactor).toFixed(4));
  const tariff = hour >= 9 && hour <= 22 ? 4.85 : 2.74;
  return { kwh, costThb: Number((kwh * tariff).toFixed(2)) };
}

export async function seed() {
  await migrate();
  await pool.query("TRUNCATE energy_readings, maintenance_logs, spare_parts, machines, copilot_messages, copilot_sessions RESTART IDENTITY CASCADE");

  for (const m of machines) {
    await pool.query(
      `INSERT INTO machines (machine_id, name, area, type, status, runtime_hours, installed_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE - INTERVAL '3 years')`,
      [...m],
    );
  }

  const now = new Date();
  now.setMinutes(0, 0, 0);
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let hourIndex = 0;
  for (let ts = start.getTime(); ts <= now.getTime(); ts += 60 * 60 * 1000) {
    const date = new Date(ts);
    const hour = date.getHours();
    for (const [machineId] of machines) {
      const r = readingFor(machineId, hourIndex, hour);
      await pool.query(
        `INSERT INTO energy_readings (machine_id, ts, kwh, cost_thb)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (machine_id, ts) DO UPDATE SET kwh = EXCLUDED.kwh, cost_thb = EXCLUDED.cost_thb`,
        [machineId, date, r.kwh, r.costThb],
      );
    }
    hourIndex += 1;
  }

  const parts = [
    ["BRG-P203", "PMP-203", "P-203 bearing kit", 1, 3, 6200],
    ["FLT-CMP03", "CMP-03", "Compressor #3 oil filter", 2, 4, 1800],
    ["BELT-CNV-B1", "CNV-B1", "Line B conveyor belt", 5, 2, 4200],
    ["VLV-CHL01", "CHL-01", "Chiller valve actuator", 1, 1, 12800],
    ["SEN-ROB02", "ROB-02", "Robot cell proximity sensor", 0, 2, 2600],
  ] as const;
  for (const p of parts) {
    await pool.query(
      `INSERT INTO spare_parts (part_id, machine_id, name, stock, min_stock, unit_cost_thb)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [...p],
    );
  }

  const logs = [
    ["CMP-03", "corrective", "High vibration inspection; bearing temperature trending up", 45, 14800, 2],
    ["PMP-203", "preventive", "Bearing lubrication and seal inspection", 30, 6200, 9],
    ["CHL-02", "planned", "Tube cleaning and refrigerant pressure check", 180, 38000, 4],
    ["CNV-B1", "corrective", "Voltage sag trip reset and belt alignment", 25, 4200, 1],
    ["CMP-01", "preventive", "Quarterly air-end inspection", 60, 9700, 18],
  ] as const;
  for (const [machineId, kind, notes, downtime, cost, daysAgo] of logs) {
    await pool.query(
      `INSERT INTO maintenance_logs (machine_id, performed_at, kind, notes, downtime_minutes, cost_thb)
       VALUES ($1, now() - ($6::TEXT || ' days')::INTERVAL, $2, $3, $4, $5)`,
      [machineId, kind, notes, downtime, cost, daysAgo],
    );
  }

  console.log("seeded 10 machines and 30 days of hourly energy readings");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(closePool)
    .catch(async (error) => {
      console.error(error);
      await closePool();
      process.exit(1);
    });
}
