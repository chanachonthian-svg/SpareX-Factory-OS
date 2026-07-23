/** SpareX Connect → FactoryOS reading adapter.
 *
 *  Connect emits flat tags per device: { tag, value, unit, addr, kind }. This
 *  translates a power meter's tags into the `PlantReading` the rule engine
 *  already accepts, and a PLC/meter device into per-machine `Asset` overrides —
 *  so `evaluateRules(liveAssets, livePlant)` fires on real numbers with NO change
 *  to the engine. Tag-name matching is lenient (template names vary by vendor). */

import type { PlantReading } from "./rules";
import { DEMO_PLANT } from "./rules";
import type { Asset } from "./factory";

export type ConnectTag = { tag: string; value: number | string; unit?: string; addr?: number; kind?: string; label?: string };
export type ConnectDevice = {
  gateway?: string;
  device: string;
  online?: boolean;
  lastSeen?: number;
  meta?: { protocol?: string; template?: string };
  oee?: { state?: string; quality?: number | null; good?: number; reject?: number };
  tags: ConnectTag[];
};

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v));

/** first matching tag value (by tag or label, case-insensitive, several aliases) */
export function tagVal(d: ConnectDevice, ...names: string[]): number | undefined {
  const want = names.map((n) => n.toLowerCase());
  for (const t of d.tags ?? []) {
    const key = (t.tag ?? "").toLowerCase();
    const lbl = (t.label ?? "").toLowerCase();
    if (want.some((w) => key === w || lbl === w || key.includes(w))) {
      const v = num(t.value);
      if (Number.isFinite(v)) return v;
    }
  }
  return undefined;
}

/** is this device a power meter (has PF + active power)? */
export function isPowerMeter(d: ConnectDevice): boolean {
  return tagVal(d, "power_factor", "pf") !== undefined &&
    tagVal(d, "active_power_total", "active_power", "kw", "total_power") !== undefined;
}

/** build the plant-level reading (PF, demand) from the incomer/main power meter.
 *  Uses the device mapped to the incomer if the map names one, else the first meter. */
export function plantFromDevices(
  devices: ConnectDevice[],
  map: Record<string, string>,
  contractKw = 3000,
): { plant: PlantReading; meterId: string } | null {
  const meters = devices.filter(isPowerMeter);
  if (!meters.length) return null;
  // prefer a meter explicitly mapped to the "incomer"/"main"/"mdb" machine
  const mainMachine = Object.keys(map).find((m) => /incom|main|mdb|plant/i.test(m));
  const mainDev = mainMachine ? map[mainMachine] : undefined;
  const meter = meters.find((d) => d.device === mainDev) ?? meters[0];
  const pf = tagVal(meter, "power_factor", "pf");
  const kw = tagVal(meter, "active_power_total", "active_power", "kw", "total_power");
  if (pf === undefined || kw === undefined) return null;
  const thdV = tagVal(meter, "thd_voltage", "voltage_thd", "thd_v", "thdv", "vthd");
  const thdI = tagVal(meter, "thd_current", "current_thd", "thd_i", "thdi", "ithd");
  return {
    plant: {
      pf: Math.round(pf * 100) / 100, demandKw: Math.round(kw), contractKw,
      thdV: thdV != null ? Math.round(thdV * 10) / 10 : undefined,
      thdI: thdI != null ? Math.round(thdI * 10) / 10 : undefined,
    },
    meterId: meter.device,
  };
}

/** overlay live readings onto the mock assets for machines that have a device
 *  mapped — real kW/temp/OEE where Connect provides it, mock elsewhere. */
export function assetsWithLive(
  base: Asset[],
  devices: ConnectDevice[],
  map: Record<string, string>,
): Asset[] {
  const byId = new Map(devices.map((d) => [d.device, d]));
  return base.map((a) => {
    const dev = map[a.id] ? byId.get(map[a.id]) : undefined;
    if (!dev) return a;
    const kw = tagVal(dev, "active_power_total", "active_power", "kw", "total_power");
    const temp = tagVal(dev, "temperature", "temp", "winding_temp", "bearing_temp");
    const vib = tagVal(dev, "vibration", "velocity_rms", "vib", "vrms");
    const good = dev.oee?.good, reject = dev.oee?.reject;
    const oee = good != null && reject != null && good + reject > 0
      ? Math.round((good / (good + reject)) * 100)
      : undefined;
    return {
      ...a,
      powerKw: kw != null ? Math.round(kw * 10) / 10 : a.powerKw,
      tempC: temp != null ? Math.round(temp) : a.tempC,
      vibration: vib != null ? Math.round(vib * 10) / 10 : a.vibration,
      oee: oee != null ? oee : a.oee,
    };
  });
}

/** convenience: the plant reading to feed the engine — live if a meter is present, else demo */
export function resolvePlant(devices: ConnectDevice[], map: Record<string, string>): { plant: PlantReading; live: boolean; meterId?: string } {
  const live = plantFromDevices(devices, map);
  return live ? { plant: live.plant, live: true, meterId: live.meterId } : { plant: DEMO_PLANT, live: false };
}
