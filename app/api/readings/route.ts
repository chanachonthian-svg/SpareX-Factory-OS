import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* Server-to-server pull from SpareX Connect. FactoryOS fetches Connect's
 * token-gated device feed (CONNECT_URL + CONNECT_TOKEN in the server env),
 * hides the token from the browser, and sidesteps CORS. The client then maps
 * the returned tags onto the rule engine (lib/connect-adapter). Falls back to
 * an empty-but-ok response when Connect isn't configured/reachable, so the UI
 * degrades to demo data instead of breaking. */

export async function GET() {
  const base = process.env.CONNECT_URL; // e.g. https://sparexth.com/connect
  const token = process.env.CONNECT_TOKEN; // = Connect's INGEST_TOKEN
  if (!base || !token) {
    return NextResponse.json({ live: false, reason: "not_configured", devices: [] });
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/pull`, {
      headers: { "x-ingest-token": token },
      cache: "no-store",
      // don't hang the UI if Connect is slow
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return NextResponse.json({ live: false, reason: `connect_${res.status}`, devices: [] });
    }
    const data = await res.json();
    const devices = Array.isArray(data.devices) ? data.devices : [];
    return NextResponse.json({ live: devices.length > 0, devices, now: data.now ?? Date.now() });
  } catch {
    return NextResponse.json({ live: false, reason: "unreachable", devices: [] });
  }
}
