"use client";

/** The one place any module gets live plant data.
 *
 *  Polls FactoryOS's `/api/readings` (which pulls SpareX Connect server-side),
 *  joins it with the user's device→machine map, and hands back everything the
 *  rule engine needs: live-overlaid assets, the plant reading, and the findings
 *  that fire on them. When Connect has nothing (or isn't configured) it falls
 *  back to the demo registry so every screen still renders — `live` tells the UI
 *  which it is, so we never present simulated numbers as measured ones. */

import { useEffect, useMemo, useState } from "react";
import { assets as demoAssets, type Asset } from "./factory";
import { loadLayout, toAssets } from "./twin-builder";
import { evaluateRules, DEMO_PLANT, type Finding, type PlantReading } from "./rules";
import { resolvePlant, assetsWithLive, type ConnectDevice } from "./connect-adapter";
import { publicAsset } from "./paths";

const MAP_KEY = "factoryos:device-map";

export type LiveReadings = {
  /** true only when real device data came back from Connect */
  live: boolean;
  devices: ConnectDevice[];
  /** assets with live values overlaid where a device is mapped */
  assets: Asset[];
  plant: PlantReading;
  /** rule findings evaluated on whatever data we have */
  findings: Finding[];
  /** machine names that are backed by a real device (for "is this live?" chips) */
  liveMachineNames: Set<string>;
  loading: boolean;
};

export function useLiveReadings(pollMs = 15000): LiveReadings {
  const [devices, setDevices] = useState<ConnectDevice[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    try { setMap(JSON.parse(localStorage.getItem(MAP_KEY) || "{}")); } catch { /* none */ }
  }, []);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch(publicAsset("/api/readings"));
        const d = await r.json();
        if (!alive) return;
        setDevices(Array.isArray(d.devices) ? d.devices : []);
        setLive(!!d.live);
      } catch { if (alive) { setDevices([]); setLive(false); } }
      finally { if (alive) setLoading(false); }
    };
    pull();
    const iv = setInterval(pull, pollMs);
    return () => { alive = false; clearInterval(iv); };
  }, [pollMs]);

  return useMemo(() => {
    // the user's own plant layout wins over the demo registry
    const layout = typeof window !== "undefined" ? loadLayout() : null;
    const base = layout?.active && layout.machines.length ? toAssets(layout) : demoAssets;
    const resolved = live ? resolvePlant(devices, map) : { plant: DEMO_PLANT, live: false as const };
    const withLive = live ? assetsWithLive(base, devices, map) : base;
    const liveNames = new Set(
      live ? base.filter((a) => map[a.id] && devices.some((d) => d.device === map[a.id])).map((a) => a.name) : [],
    );
    return {
      live: live && resolved.live,
      devices,
      assets: withLive,
      plant: resolved.plant,
      findings: evaluateRules(withLive, resolved.plant),
      liveMachineNames: liveNames,
      loading,
    };
  }, [devices, live, map, loading]);
}
