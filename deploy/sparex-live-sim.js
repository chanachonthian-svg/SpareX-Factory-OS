#!/usr/bin/env node
/* SpareX live device simulator — a persistent pm2 process that pushes realistic,
 * slowly-wandering readings into SpareX Connect's /api/ingest every 12 s, so the
 * FactoryOS rule engine has continuously-fresh REAL data to evaluate. Stands in
 * for physical meters/PLCs/sensors until they're wired; the data path (ingest →
 * store → FactoryOS pull → rules) is identical to a real gateway's.
 *
 * Values wander across the rule thresholds so rules fire and clear over time:
 *   power meter : PF 0.79–0.91 (limit 0.85) · demand 2620–2980 kW (contract 3000)
 *                 THD_v 3–6% (IEEE-519 5%) · kVAR derived · Active_Energy counts up
 *   vibration   : 2.6–5.0 mm/s (ISO 10816 C/D = 4.5)
 *   PLC line    : good/reject → OEE ~85–93%
 *
 * Config comes from /opt/sparex-live-sim.env (INGEST_TOKEN, CONNECT_INGEST). */

const fs = require("fs");

function loadEnv(path) {
  const out = {};
  try {
    for (const line of fs.readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) out[m[1]] = m[2];
    }
  } catch { /* fall through to process.env */ }
  return out;
}

const env = { ...loadEnv("/opt/sparex-live-sim.env"), ...process.env };
const TOKEN = env.INGEST_TOKEN;
const URL = env.CONNECT_INGEST || "https://sparexth.com/connect/api/ingest";
const EVERY_MS = 12000;

if (!TOKEN) { console.error("no INGEST_TOKEN — set it in /opt/sparex-live-sim.env"); process.exit(1); }

let energyKwh = 1_284_560; // cumulative meter counter
let good = 148_200, reject = 15_100; // PLC lifetime counts
const t0 = Date.now();

function wave(periodSec, phase = 0) {
  const t = (Date.now() - t0) / 1000;
  return Math.sin((2 * Math.PI * t) / periodSec + phase);
}

async function push(payload) {
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ingest-token": TOKEN },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error(`ingest ${payload.device} -> ${res.status}`);
  } catch (e) { console.error(`ingest ${payload.device} failed: ${e.message}`); }
}

async function tick() {
  const pf = Math.round((0.85 + 0.06 * wave(180)) * 1000) / 1000;      // 0.79–0.91
  const kw = Math.round(2800 + 180 * wave(150, 1));                    // 2620–2980
  const thdV = Math.round((4.5 + 1.5 * wave(200, 2)) * 10) / 10;       // 3.0–6.0
  const thdI = Math.round((5.5 + 2.0 * wave(170, 0.5)) * 10) / 10;
  const kvar = Math.round(kw * Math.tan(Math.acos(pf)));
  energyKwh += (kw * EVERY_MS) / 3_600_000;
  const vib = Math.round((3.8 + 1.2 * wave(140, 3)) * 100) / 100;      // 2.6–5.0
  const bearingTemp = Math.round(62 + 22 * wave(210, 1.5));            // 40–84 °C
  const g = 20 + Math.round(2 * (1 + wave(90))), r = Math.round(2 + 1.5 * (1 + wave(90, 2)));
  good += g; reject += r;

  await Promise.all([
    push({
      gateway: "gw-main", device: "MTR-INCOMER",
      meta: { protocol: "modbus-tcp", template: "schneider-powerlogic" },
      tags: [
        { tag: "Active_Power_Total", value: kw, unit: "kW" },
        { tag: "Power_Factor", value: pf },
        { tag: "THD_Voltage", value: thdV, unit: "%" },
        { tag: "THD_Current", value: thdI, unit: "%" },
        { tag: "Reactive_Power", value: kvar, unit: "kVAR" },
        { tag: "Voltage_A_N", value: 230 + Math.round(4 * wave(60)), unit: "V" },
        { tag: "Active_Energy", value: Math.round(energyKwh), unit: "kWh" },
      ],
    }),
    push({
      gateway: "gw-floor", device: "VIB-CNC01",
      meta: { protocol: "mqtt", template: "vibration-sensor" },
      tags: [
        { tag: "Vibration", value: vib, unit: "mm/s" },
        { tag: "Bearing_Temp", value: bearingTemp, unit: "°C" },
      ],
    }),
    push({
      gateway: "gw-floor", device: "PLC-LINE-A",
      meta: { protocol: "modbus-tcp", template: "plc-production" },
      oee: { state: "run", good, reject, quality: Math.round((good / (good + reject)) * 100) },
      tags: [
        { tag: "Good_Count", value: good, unit: "pcs", kind: "counter" },
        { tag: "Reject_Count", value: reject, unit: "pcs", kind: "counter" },
        { tag: "Machine_State", value: 1, label: "Run", kind: "state" },
      ],
    }),
  ]);
  console.log(`${new Date().toISOString()} pushed · PF ${pf} · ${kw}kW · THDv ${thdV}% · vib ${vib}mm/s`);
}

console.log(`sparex-live-sim → ${URL} every ${EVERY_MS / 1000}s`);
tick();
setInterval(tick, EVERY_MS);
