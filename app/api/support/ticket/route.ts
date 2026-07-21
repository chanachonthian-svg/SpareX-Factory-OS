import { NextResponse } from "next/server";
import { foldTickets, type SupportEvent, type TicketLevel } from "@/lib/support";
import { readEvents, writeEvent } from "@/lib/support-store";

export const runtime = "nodejs";

const SUPPORT_KEY = process.env.SUPPORT_KEY || "";
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const clean = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);
const isAgent = (req: Request) => !!SUPPORT_KEY && req.headers.get("x-support-key") === SUPPORT_KEY;

/* GET ?id=…&email=… — the chat, polled every few seconds by both sides.
 * A customer may only read their own ticket; an agent needs the support key. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = clean(url.searchParams.get("id"), 40);
  const email = clean(url.searchParams.get("email"), 160).toLowerCase();
  const t = foldTickets(await readEvents()).get(id);
  if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const allowed = isAgent(req) || (!!email && t.customer.email.toLowerCase() === email);
  if (!allowed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ticket: t });
}

/* POST — actions on a ticket:
 *   { action: "msg",     id, from, name, text }
 *   { action: "claim",   id, agentName, agentEmail }   (agent only)
 *   { action: "close",   id, by, level? }              (agent sets L1/L2/L3; customer close has no level)
 *   { action: "rate",    id, email, stars, comment? }  (customer only, after close)
 *   { action: "approve", id, by }                      (admin key only — releases the payout)  */
export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* validated below */ }

  const action = clean(b.action, 12);
  const id = clean(b.id, 40);
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const tickets = foldTickets(await readEvents());
  const t = tickets.get(id);
  if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const at = new Date().toISOString();
  const agent = isAgent(req);

  if (action === "claim") {
    if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    // optimistic: append anyway — the fold makes the first claim win, so a losing
    // racer simply reads back someone else's name instead of getting an error
    await writeEvent({ t: "claimed", id, at, agentName: clean(b.agentName, 120) || "Support", agentEmail: clean(b.agentEmail, 160) } as SupportEvent);
    const after = foldTickets(await readEvents()).get(id);
    const mine = after?.agent?.email === clean(b.agentEmail, 160);
    return NextResponse.json({ ok: true, won: mine, agent: after?.agent });
  }

  if (action === "msg") {
    const text = clean(b.text, 2000);
    if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
    const from = clean(b.from, 10) === "agent" ? "agent" : "customer";
    if (from === "agent" && !agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (from === "customer" && clean(b.email, 160).toLowerCase() !== t.customer.email.toLowerCase()) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (t.status === "closed") return NextResponse.json({ error: "closed" }, { status: 409 });
    await writeEvent({ t: "msg", id, at, from, name: clean(b.name, 120) || (from === "agent" ? "Support" : t.customer.name), text } as SupportEvent);
    return NextResponse.json({ ok: true });
  }

  if (action === "close") {
    const by = clean(b.by, 120) || "system";
    if (!agent && clean(b.email, 160).toLowerCase() !== t.customer.email.toLowerCase()) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const lv = clean(b.level, 4);
    const level = agent && (lv === "L1" || lv === "L2" || lv === "L3") ? (lv as TicketLevel) : undefined;
    await writeEvent({ t: "closed", id, at, by, level } as SupportEvent);
    return NextResponse.json({ ok: true });
  }

  if (action === "rate") {
    if (clean(b.email, 160).toLowerCase() !== t.customer.email.toLowerCase()) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (t.status !== "closed") return NextResponse.json({ error: "not_closed" }, { status: 409 });
    const stars = Math.round(Number(b.stars));
    if (!(stars >= 1 && stars <= 5)) return NextResponse.json({ error: "bad_stars" }, { status: 400 });
    await writeEvent({ t: "rated", id, at, stars, comment: clean(b.comment, 500) || undefined } as SupportEvent);
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (!ADMIN_KEY || req.headers.get("x-admin-key") !== ADMIN_KEY) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (t.status !== "closed") return NextResponse.json({ error: "not_closed" }, { status: 409 });
    await writeEvent({ t: "approved", id, at, by: clean(b.by, 120) || "admin" } as SupportEvent);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad_action" }, { status: 400 });
}
