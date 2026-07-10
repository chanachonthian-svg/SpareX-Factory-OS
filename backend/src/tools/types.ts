import { z } from "zod";

export const periodSchema = z.enum(["today", "7d", "30d"]);

export const getEnergyCostSchema = z.object({
  period: periodSchema,
});

export const getTopEnergyConsumersSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5),
});

export const getMachineStatusSchema = z.object({
  machine_id: z.string().min(1).max(64),
});

export type FactoryToolName =
  | "get_energy_cost"
  | "get_top_energy_consumers"
  | "get_machine_status"
  | "get_spare_parts_alerts";

export type ToolResult<T> = {
  data_as_of: string;
  data: T;
};

export type DailyEnergyBreakdown = {
  date: string;
  kwh: number;
  cost_thb: number;
};

export type EnergyCostData = {
  period: "today" | "7d" | "30d";
  total_kwh: number;
  total_cost_thb: number;
  daily_breakdown: DailyEnergyBreakdown[];
};

export type EnergyConsumer = {
  machine_id: string;
  machine_name: string;
  area: string;
  kwh: number;
  cost_thb: number;
  kwh_share_pct: number;
};

export type MachineStatusData = {
  machine_id: string;
  machine_name: string;
  area: string;
  type: string;
  status: string;
  runtime_hours: number;
  last_maintenance: null | {
    performed_at: string;
    kind: string;
    notes: string;
    downtime_minutes: number;
    cost_thb: number;
  };
};

export type SparePartAlert = {
  part_id: string;
  part_name: string;
  machine_id: string;
  machine_name: string;
  stock: number;
  min_stock: number;
  shortage: number;
};
