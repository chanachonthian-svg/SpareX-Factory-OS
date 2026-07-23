import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Tiny gate for SpareX-only admin pages that render client-computed content
 *  (e.g. the Engineering Rules catalog) and have no data API of their own. */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_KEY || "";
  const key = req.headers.get("x-admin-key") || "";
  if (!expected || key !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
