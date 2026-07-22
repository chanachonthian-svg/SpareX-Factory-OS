import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

/* Real alert delivery for FactoryOS notifications.
 *  - Email: uses the plant's own SMTP (same Gmail app-password as OTP/leads).
 *  - LINE: LINE Messaging API push (LINE Notify was discontinued Mar 2025) —
 *    needs LINE_CHANNEL_TOKEN + LINE_TARGET_ID in the server env; until those
 *    are set it reports "not_configured" instead of failing.
 *  A "test" send from Settings proves the channels; the same route can later be
 *  called by the alert engine with a real subject/body. */

const clean = (v: unknown, max = 800) => String(v ?? "").trim().slice(0, max);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// light per-process cooldown so the test button can't be hammered
let lastSend = 0;

export async function POST(req: Request) {
  const now = Date.now();
  if (now - lastSend < 6000) {
    return NextResponse.json({ error: "cooldown", retryInMs: 6000 - (now - lastSend) }, { status: 429 });
  }
  lastSend = now;

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* validated below */ }

  const test = b.test === true;
  const email = clean(b.email, 160);
  const emailOn = b.emailOn !== false;
  const lineOn = b.lineOn !== false;
  const subject = clean(b.subject, 160) || (test ? "🏭 FactoryOS · ทดสอบการแจ้งเตือน" : "🏭 FactoryOS · แจ้งเตือน");
  const body = clean(b.body, 1500) || (test
    ? "นี่คือข้อความทดสอบจาก SpareX FactoryOS — ถ้าคุณได้รับ แสดงว่าช่องทางแจ้งเตือนนี้พร้อมใช้งานแล้ว ✅\n\nการแจ้งเตือนจริง (ไฟเกินสัญญา, ไฟตก/กระชาก, เสี่ยงเครื่องเสีย) จะส่งมาทางนี้"
    : "แจ้งเตือนจาก FactoryOS");

  // ── Email (SMTP) ──
  let emailResult: "sent" | "skipped" | "failed" | "not_configured" | "bad_address" = "skipped";
  if (emailOn) {
    if (!isEmail(email)) emailResult = "bad_address";
    else if (!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) emailResult = "not_configured";
    else {
      try {
        const port = Number(process.env.SMTP_PORT || 465);
        const tx = nodemailer.createTransport({
          host: process.env.SMTP_HOST, port, secure: port === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await tx.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject,
          text: body,
        });
        emailResult = "sent";
      } catch { emailResult = "failed"; }
    }
  }

  // ── LINE (Messaging API push) ──
  let lineResult: "sent" | "skipped" | "failed" | "not_configured" = "skipped";
  if (lineOn) {
    const token = process.env.LINE_CHANNEL_TOKEN;
    const target = process.env.LINE_TARGET_ID;
    if (!token || !target) lineResult = "not_configured";
    else {
      try {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ to: target, messages: [{ type: "text", text: `${subject}\n\n${body}`.slice(0, 4900) }] }),
        });
        lineResult = res.ok ? "sent" : "failed";
      } catch { lineResult = "failed"; }
    }
  }

  return NextResponse.json({ ok: true, email: emailResult, line: lineResult });
}
