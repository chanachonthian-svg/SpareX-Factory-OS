import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/* Measured energy history, pulled server-to-server from SpareX Connect.
 * Connect derives day/month kWh from the meter's cumulative Active_Energy
 * counter (real rollups on disk), so this is metered data — not a model.
 * GET /api/history?device=<connect-device-id>&months=12
 * Falls back to `{ live:false }` so charts can keep their modelled series. */

export async function GET(req: NextRequest) {
  const base = process.env.CONNECT_URL;
  const token = process.env.CONNECT_TOKEN;
  const device = req.nextUrl.searchParams.get("device");
  if (!base || !token) return NextResponse.json({ live: false, reason: "not_configured" });
  if (!device || !/^[a-z0-9-]+$/.test(device)) {
    return NextResponse.json({ live: false, reason: "bad_device" }, { status: 400 });
  }
  const months = Math.min(24, Math.max(1, Number(req.nextUrl.searchParams.get("months") ?? 12)));
  const rate = Number(req.nextUrl.searchParams.get("rate") ?? 4.3297); // TH on-peak default

  try {
    const url = `${base.replace(/\/$/, "")}/api/pull?energy=${encodeURIComponent(device)}&months=${months}&rate=${rate}`;
    const res = await fetch(url, {
      headers: { "x-ingest-token": token },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ live: false, reason: `connect_${res.status}` });
    const report = await res.json();
    const hasData = Array.isArray(report?.months) ? report.months.length > 0 : false;
    return NextResponse.json({ live: hasData, ...report });
  } catch {
    return NextResponse.json({ live: false, reason: "unreachable" });
  }
}
