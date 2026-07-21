import { NextResponse } from "next/server";
import { readFile } from "fs/promises";

export const runtime = "nodejs";

/* Admin-only demo analytics. Gated by a single shared passphrase (ADMIN_KEY on
 * the server). Joins the usage events (per session/tab/dwell) with the leads log
 * (name/company/phone) and returns one row per visit session. */

const EVENTS_FILE = process.env.EVENTS_FILE || "/opt/factoryos-events.ndjson";
const LEADS_FILE = process.env.LEADS_FILE || "/opt/factoryos-leads.ndjson";

async function readNdjson(path: string): Promise<Record<string, unknown>[]> {
  try {
    const txt = await readFile(path, "utf8");
    return txt.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) as Record<string, unknown>[];
  } catch { return []; }
}

/** friendly tab label from a route path */
function labelOf(path: string): string {
  const p = path.replace(/^\/os\/?/, "") || "executive";
  const map: Record<string, string> = {
    "": "Executive Dashboard", executive: "Executive Dashboard",
    energy: "Energy", "power-quality": "Power Quality", vortiq: "Vortiq (Air)",
    rpm: "RPM", vision: "VisionIQ", production: "Production", carbon: "Sustainability",
    twin: "Digital Twin", alarms: "Alarms", events: "Events", workorders: "Work Orders",
    notifications: "Notifications", reports: "Reports", settings: "Settings", peakshield: "PeakShield",
  };
  return map[p] ?? p;
}

export async function POST(req: Request) {
  const key = req.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_KEY || "";
  if (!expected || key !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [events, leads] = await Promise.all([readNdjson(EVENTS_FILE), readNdjson(LEADS_FILE)]);

  // latest lead per email → contact details
  const contactByEmail = new Map<string, { name: string; company: string; phone: string }>();
  for (const l of leads) {
    const email = String(l.email || "").toLowerCase();
    if (!email) continue;
    contactByEmail.set(email, { name: String(l.name || ""), company: String(l.company || ""), phone: String(l.phone || "") });
  }

  // group events by session id
  type Sess = { sid: string; email: string; firstAt: string; lastAt: string; dwellByPath: Record<string, number>; order: string[]; views: number };
  const sessions = new Map<string, Sess>();
  for (const e of events) {
    const sid = String(e.sid || "");
    if (!sid) continue;
    const at = String(e.at || "");
    const s = sessions.get(sid) ?? { sid, email: "", firstAt: at, lastAt: at, dwellByPath: {}, order: [], views: 0 };
    if (e.email) s.email = String(e.email);
    if (at < s.firstAt) s.firstAt = at;
    if (at > s.lastAt) s.lastAt = at;
    const path = String(e.path || "");
    if (e.type === "view") { s.views += 1; if (!s.order.includes(path)) s.order.push(path); }
    if (e.type === "dwell") s.dwellByPath[path] = (s.dwellByPath[path] || 0) + (Number(e.ms) || 0);
    sessions.set(sid, s);
  }

  const rows = [...sessions.values()].map((s) => {
    const totalMs = Object.values(s.dwellByPath).reduce((a, b) => a + b, 0);
    const c = contactByEmail.get(s.email.toLowerCase()) || { name: "", company: "", phone: "" };
    const tabs = Object.entries(s.dwellByPath)
      .map(([path, ms]) => ({ label: labelOf(path), ms }))
      .sort((a, b) => b.ms - a.ms);
    return {
      sid: s.sid, email: s.email, name: c.name, company: c.company, phone: c.phone,
      firstAt: s.firstAt, lastAt: s.lastAt, totalMs, views: s.views,
      tabCount: Object.keys(s.dwellByPath).length, tabs,
      timeline: s.order.map(labelOf),
    };
  }).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));

  // top-level summary
  const tabTotals: Record<string, number> = {};
  for (const r of rows) for (const t of r.tabs) tabTotals[t.label] = (tabTotals[t.label] || 0) + t.ms;
  const topTabs = Object.entries(tabTotals).map(([label, ms]) => ({ label, ms })).sort((a, b) => b.ms - a.ms).slice(0, 8);
  const withContact = rows.filter((r) => r.name || r.phone).length;
  const avgMs = rows.length ? Math.round(rows.reduce((s, r) => s + r.totalMs, 0) / rows.length) : 0;

  return NextResponse.json({
    summary: { sessions: rows.length, withContact, avgMs, topTabs },
    rows,
  });
}
