import { describe, expect, it } from "vitest";
import type { Queryable } from "../src/db/pool.js";
import { getEnergyCost, getMachineStatus, getSparePartsAlerts, getTopEnergyConsumers } from "../src/tools/factoryTools.js";

function fakeDb(rowsByCall: unknown[][]): Queryable {
  let call = 0;
  return {
    async query() {
      const rows = rowsByCall[call] || [];
      call += 1;
      return { rows, rowCount: rows.length } as never;
    },
  };
}

describe("factory tool layer", () => {
  it("returns energy cost with daily breakdown and data_as_of", async () => {
    const db = fakeDb([
      [{ total_kwh: "120.5", total_cost_thb: "580.25" }],
      [{ day: new Date("2026-07-08T00:00:00Z"), kwh: "120.5", cost_thb: "580.25" }],
      [{ data_as_of: new Date("2026-07-08T14:00:00Z") }],
    ]);

    const result = await getEnergyCost(db, { period: "today" });
    expect(result.data_as_of).toBe("2026-07-08T14:00:00.000Z");
    expect(result.data.total_kwh).toBe(120.5);
    expect(result.data.total_cost_thb).toBe(580.25);
    expect(result.data.daily_breakdown[0]).toEqual({ date: "2026-07-08", kwh: 120.5, cost_thb: 580.25 });
  });

  it("ranks top energy consumers by kWh share", async () => {
    const db = fakeDb([
      [{ machine_id: "CMP-03", machine_name: "Compressor #3", area: "Utilities", kwh: "2200", cost_thb: "9800", kwh_share_pct: "22.347" }],
      [{ data_as_of: new Date("2026-07-08T14:00:00Z") }],
    ]);

    const result = await getTopEnergyConsumers(db, { limit: 1 });
    expect(result.data).toEqual([
      { machine_id: "CMP-03", machine_name: "Compressor #3", area: "Utilities", kwh: 2200, cost_thb: 9800, kwh_share_pct: 22.35 },
    ]);
  });

  it("returns machine status and latest maintenance", async () => {
    const db = fakeDb([
      [{ machine_id: "PMP-203", name: "Pump P-203", area: "Chilled Water", type: "pump", status: "running", runtime_hours: "9420.5" }],
      [{ performed_at: new Date("2026-07-07T09:00:00Z"), kind: "preventive", notes: "Bearing check", downtime_minutes: 30, cost_thb: "6200" }],
      [{ data_as_of: new Date("2026-07-08T14:00:00Z") }],
    ]);

    const result = await getMachineStatus(db, { machine_id: "PMP-203" });
    expect(result.data?.status).toBe("running");
    expect(result.data?.last_maintenance?.notes).toBe("Bearing check");
  });

  it("returns spare parts below minimum stock", async () => {
    const db = fakeDb([
      [{ part_id: "BRG-P203", part_name: "P-203 bearing kit", machine_id: "PMP-203", machine_name: "Pump P-203", stock: 1, min_stock: 3, shortage: 2 }],
      [{ data_as_of: new Date("2026-07-08T14:00:00Z") }],
    ]);

    const result = await getSparePartsAlerts(db);
    expect(result.data[0].shortage).toBe(2);
  });
});
