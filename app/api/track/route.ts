import { NextResponse } from "next/server";
import { appendFile } from "fs/promises";

export const runtime = "nodejs";

/* Demo usage tracking — every route view + per-tab dwell time is appended to
 * EVENTS_FILE (NDJSON, outside the app dir so deploys don't touch it). Tied to
 * the visitor's login email so the admin analytics page can join name/phone
 * from the leads log. Writes are best-effort and never block the UX. */

const EVENTS_FILE = process.env.EVENTS_FILE || "/opt/factoryos-events.ndjson";
const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* validated below */ }

  const type = clean(b.type, 12);
  if (type !== "view" && type !== "dwell") return NextResponse.json({ ok: false });

  const ev = {
    type,
    sid: clean(b.sid, 40),
    email: clean(b.email, 160).toLowerCase(),
    path: clean(b.path, 120),
    ms: type === "dwell" ? Math.max(0, Math.min(Number(b.ms) || 0, 6 * 3600_000)) : undefined,
    at: new Date().toISOString(),
  };
  if (!ev.sid || !ev.path) return NextResponse.json({ ok: false });

  try { await appendFile(EVENTS_FILE, JSON.stringify(ev) + "\n", "utf8"); } catch { /* ignore */ }
  return NextResponse.json({ ok: true });
}
