import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import nodemailer from "nodemailer";
import { signOtp } from "@/lib/otp";

export const runtime = "nodejs";

/* Real OTP delivery. Configure SMTP via env (on the server these live in
 * /opt/factoryos.env, loaded by the pm2 start scripts):
 *   SMTP_HOST, SMTP_PORT (465 = TLS, 587 = STARTTLS), SMTP_USER, SMTP_PASS,
 *   SMTP_FROM ("SpareX FactoryOS <no-reply@sparexth.com>"), OTP_SECRET
 * With no SMTP configured the route answers { demo: true } and the login page
 * falls back to the on-screen demo code — local dev keeps working untouched. */

const OTP_TTL_MS = 10 * 60 * 1000; // code valid 10 min
const COOLDOWN_MS = 60 * 1000; // 1 email / minute / address

const lastSent = new Map<string, number>(); // per-address cooldown (single pm2 instance)

function smtpReady() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function otpEmailHtml(code: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0b0e14;font-family:Tahoma,'Segoe UI',sans-serif">
  <div style="max-width:460px;margin:0 auto;padding:36px 24px">
    <p style="color:#22d3ee;font-size:13px;font-weight:bold;letter-spacing:2px;margin:0">SPAREX FACTORYOS™</p>
    <div style="background:#12161f;border:1px solid #232a38;border-radius:16px;padding:28px;margin-top:14px">
      <p style="color:#e2e8f0;font-size:16px;font-weight:bold;margin:0 0 6px">รหัสยืนยันของคุณ</p>
      <p style="color:#8b93a7;font-size:13px;margin:0 0 18px">ใช้รหัสนี้เพื่อเข้าสู่ FactoryOS Demo — หมดอายุใน 10 นาที</p>
      <p style="background:#0b0e14;border:1px solid #22d3ee55;border-radius:12px;color:#22d3ee;font-size:32px;font-weight:bold;letter-spacing:10px;text-align:center;padding:16px 8px;margin:0">${code}</p>
      <p style="color:#5b6372;font-size:11.5px;margin:18px 0 0">ถ้าคุณไม่ได้ขอรหัสนี้ ไม่ต้องทำอะไร — ไม่มีใครเข้าระบบได้หากไม่มีรหัสจากอีเมลนี้</p>
    </div>
    <p style="color:#5b6372;font-size:11px;margin:14px 0 0;text-align:center">SpareX Company Limited · sparexth.com</p>
  </div></body></html>`;
}

export async function POST(req: Request) {
  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email || "").trim().toLowerCase();
  } catch { /* fall through to validation */ }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  // no SMTP configured → tell the client to run its built-in demo flow
  if (!smtpReady()) return NextResponse.json({ demo: true });

  const now = Date.now();
  const last = lastSent.get(email) ?? 0;
  if (now - last < COOLDOWN_MS) {
    return NextResponse.json({ error: "cooldown", retryInS: Math.ceil((COOLDOWN_MS - (now - last)) / 1000) }, { status: 429 });
  }

  const code = String(randomInt(100000, 1000000));
  const exp = now + OTP_TTL_MS;
  const token = signOtp(email, code, exp);

  try {
    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `รหัสยืนยัน FactoryOS: ${code}`,
      text: `รหัสยืนยันของคุณคือ ${code} (หมดอายุใน 10 นาที)`,
      html: otpEmailHtml(code),
    });
    lastSent.set(email, now);
    return NextResponse.json({ sent: true, exp, token });
  } catch (e) {
    console.error("[otp/send] mail failed:", (e as Error).message);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
}
