import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { signOtp } from "@/lib/otp";

export const runtime = "nodejs";

/** Verify the 6-digit code against the stateless token issued by /api/otp/send. */
export async function POST(req: Request) {
  let email = "", code = "", token = "", exp = 0;
  try {
    const body = await req.json();
    email = String(body?.email || "").trim().toLowerCase();
    code = String(body?.code || "").trim();
    token = String(body?.token || "");
    exp = Number(body?.exp || 0);
  } catch { /* fall through */ }

  if (!email || !/^\d{6}$/.test(code) || !token || !exp) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (Date.now() > exp) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const expected = signOtp(email, code, exp);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token.padEnd(expected.length, "0").slice(0, expected.length), "hex");
  const ok = a.length === b.length && timingSafeEqual(a, b);

  if (!ok) return NextResponse.json({ error: "wrong_code" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
