import { NextResponse } from "next/server";
import { appendFile } from "fs/promises";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

/* Lead capture — every demo lead lands in two places:
 *   1. an instant email to LEAD_TO (default admin@sparexth.com) via the same
 *      SMTP config as the OTP mailer (/opt/factoryos.env on the server)
 *   2. a permanent NDJSON log at LEADS_FILE (default /opt/factoryos-leads.ndjson,
 *      outside the app dir so deploys never touch it)
 * Either sink succeeding counts as success; with neither configured (local dev)
 * the route still answers ok so the demo UX never breaks. */

const LEADS_FILE = process.env.LEADS_FILE || "/opt/factoryos-leads.ndjson";
const LEAD_TO = process.env.LEAD_TO || "admin@sparexth.com";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

function smtpReady() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function leadEmailHtml(l: Record<string, string>) {
  const row = (k: string, v: string) =>
    v ? `<tr><td style="padding:6px 14px 6px 0;color:#8b93a7;font-size:13px;white-space:nowrap">${k}</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;font-weight:bold">${esc(v)}</td></tr>` : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0b0e14;font-family:Tahoma,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <p style="color:#22d3ee;font-size:13px;font-weight:bold;letter-spacing:2px;margin:0">SPAREX FACTORYOS™ · LEAD</p>
    <div style="background:#12161f;border:1px solid #232a38;border-radius:16px;padding:26px;margin-top:14px">
      <p style="color:#e2e8f0;font-size:17px;font-weight:bold;margin:0 0 4px">🔥 มีผู้สนใจกรอกข้อมูลติดต่อกลับ</p>
      <p style="color:#8b93a7;font-size:12.5px;margin:0 0 16px">จาก: ${esc(l.source)} · ${esc(l.at)}</p>
      <table style="border-collapse:collapse">
        ${row("ชื่อ", l.name)}
        ${row("บริษัท/โรงงาน", l.company)}
        ${row("เบอร์โทร", l.phone)}
        ${row("อีเมล (login)", l.email)}
        ${row("รายละเอียดเพิ่มเติม", l.note)}
      </table>
    </div>
    <p style="color:#5b6372;font-size:11px;margin:14px 0 0;text-align:center">บันทึกสำรองเก็บไว้ที่เซิร์ฟเวอร์ (factoryos-leads.ndjson)</p>
  </div></body></html>`;
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* validated below */ }

  const lead = {
    name: clean(body.name, 120),
    company: clean(body.company, 160),
    phone: clean(body.phone, 40),
    email: clean(body.email, 160),
    source: clean(body.source, 40) || "demo-gate",
    note: clean(body.note, 1500),
    at: new Date().toISOString(),
    ua: clean(req.headers.get("user-agent"), 200),
  };
  if (!lead.name && !lead.phone && !lead.email) {
    return NextResponse.json({ error: "empty_lead" }, { status: 400 });
  }

  let stored = false;
  let mailed = false;

  try {
    await appendFile(LEADS_FILE, JSON.stringify(lead) + "\n", "utf8");
    stored = true;
  } catch { /* e.g. local dev on Windows — email may still work */ }

  if (smtpReady()) {
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
        to: LEAD_TO,
        subject: `🔥 Lead ใหม่ · ${lead.name || lead.email}${lead.company ? ` · ${lead.company}` : ""}`,
        text: `Lead: ${lead.name} · ${lead.company} · ${lead.phone} · ${lead.email} · ${lead.source} · ${lead.at}\n${lead.note}`,
        html: leadEmailHtml(lead),
      });
      mailed = true;
    } catch (e) {
      console.error("[lead] mail failed:", (e as Error).message);
    }
  }

  // never fail the customer's UX over our own sinks
  return NextResponse.json({ ok: true, stored, mailed });
}
