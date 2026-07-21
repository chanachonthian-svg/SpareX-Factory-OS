import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { foldTickets, newTicketId, type SupportEvent, type Ticket } from "@/lib/support";
import { readEvents, writeEvent } from "@/lib/support-store";

export const runtime = "nodejs";

const SUPPORT_KEY = process.env.SUPPORT_KEY || "";
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const LEAD_TO = process.env.LEAD_TO || "admin@sparexth.com";

const clean = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/** what a freelancer may see on the board — never the customer's plant data */
function forBoard(t: Ticket) {
  return {
    id: t.id, at: t.at, subject: t.subject, status: t.status,
    company: t.customer.company || "", ctx: t.ctx,
    agent: t.agent ? { name: t.agent.name, email: t.agent.email } : undefined,
    msgs: t.messages.length, lastAt: t.lastAt,
  };
}

/* GET — role-scoped ticket lists:
 *   ?role=customer&email=…            → that customer's own tickets
 *   ?role=agent    (x-support-key)    → the freelancer board
 *   ?role=admin    (x-admin-key)      → everything, full detail  */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const role = url.searchParams.get("role") || "customer";
  const tickets = [...foldTickets(await readEvents()).values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));

  if (role === "admin") {
    if (!ADMIN_KEY || req.headers.get("x-admin-key") !== ADMIN_KEY) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ tickets });
  }
  if (role === "agent") {
    if (!SUPPORT_KEY || req.headers.get("x-support-key") !== SUPPORT_KEY) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ tickets: tickets.map(forBoard) });
  }
  const email = clean(url.searchParams.get("email"), 160).toLowerCase();
  if (!email) return NextResponse.json({ tickets: [] });
  return NextResponse.json({ tickets: tickets.filter((t) => t.customer.email.toLowerCase() === email) });
}

/* POST — a customer opens a ticket */
export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* validated below */ }

  const subject = clean(b.subject, 120);
  const body = clean(b.body, 2000);
  const email = clean(b.email, 160).toLowerCase();
  if (!subject || !body) return NextResponse.json({ error: "empty" }, { status: 400 });

  const ev: SupportEvent = {
    t: "created",
    id: newTicketId(),
    at: new Date().toISOString(),
    email, name: clean(b.name, 120) || email || "ผู้ใช้งาน Demo",
    company: clean(b.company, 160),
    subject, body,
    ctx: {
      path: clean((b.ctx as Ctx0)?.path, 120),
      module: clean((b.ctx as Ctx0)?.module, 60),
      ua: clean(req.headers.get("user-agent"), 160),
    },
  };
  const ok = await writeEvent(ev);

  // nudge the support pool so someone claims it fast — admin + the freelance
  // mailing list (SUPPORT_NOTIFY_TO, comma-separated), plus LINE if configured
  const notifyText = `${ev.name} (${email})\n${ev.company || "-"}\n\n${body}\n\nหน้า: ${ev.ctx?.path || "-"}\nรับงานที่: /support`;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const port = Number(process.env.SMTP_PORT || 465);
      const tx = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port, secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const to = [LEAD_TO, ...(process.env.SUPPORT_NOTIFY_TO || "").split(",").map((s) => s.trim()).filter(Boolean)];
      await tx.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: to.join(", "),
        subject: `🎫 Ticket ใหม่ ${ev.id} · ${subject}`,
        text: notifyText,
      });
    } catch { /* email is a nudge, not the system of record */ }
  }
  // LINE Messaging API push (LINE Notify was discontinued Mar 2025) — needs a
  // channel token + a group/user id in env; silently skipped until configured
  if (process.env.LINE_CHANNEL_TOKEN && process.env.LINE_TARGET_ID) {
    try {
      await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LINE_CHANNEL_TOKEN}` },
        body: JSON.stringify({ to: process.env.LINE_TARGET_ID, messages: [{ type: "text", text: `🎫 Ticket ใหม่ ${ev.id}\n${subject}\n\n${notifyText}`.slice(0, 4900) }] }),
      });
    } catch { /* same — a nudge only */ }
  }

  return NextResponse.json({ ok, id: ev.id });
}

type Ctx0 = { path?: string; module?: string };
