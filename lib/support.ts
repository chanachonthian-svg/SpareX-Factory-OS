/** Support ticket store — append-only event log (NDJSON) folded into state.
 *
 *  Why events instead of a mutable record: two freelancers can hit "claim" on the
 *  same ticket at the same moment. Appending is safe under concurrency; a
 *  read-modify-write on a JSON blob is not. The fold below makes the FIRST claim
 *  event win deterministically, so the race resolves itself with no lock and no DB.
 *  (Phase 1 volume only — move to Postgres when tickets outgrow one file.) */

export type TicketStatus = "open" | "claimed" | "closed";
export type Sender = "customer" | "agent";

export type Ctx = { path?: string; module?: string; ua?: string };

export type TicketLevel = "L1" | "L2" | "L3";

export type SupportEvent =
  | { t: "created"; id: string; at: string; email: string; name: string; company?: string; subject: string; body: string; ctx?: Ctx }
  | { t: "claimed"; id: string; at: string; agentName: string; agentEmail: string }
  | { t: "msg"; id: string; at: string; from: Sender; name: string; text: string }
  | { t: "closed"; id: string; at: string; by: string; level?: TicketLevel }
  | { t: "rated"; id: string; at: string; stars: number; comment?: string }
  | { t: "approved"; id: string; at: string; by: string };

export type Message = { at: string; from: Sender; name: string; text: string };

export type Ticket = {
  id: string;
  at: string;
  customer: { email: string; name: string; company?: string };
  subject: string;
  body: string;
  ctx: Ctx;
  status: TicketStatus;
  agent?: { name: string; email: string; at: string };
  messages: Message[];
  lastAt: string;
  closedAt?: string;
  level?: TicketLevel;
  rating?: { stars: number; comment?: string; at: string };
  approvedBy?: string;
};

/* ── payout model (phase 2) ──
 * Flat per-ticket pay makes everyone cherry-pick easy tickets; pay by level so
 * hard work pays more, and add a waiting bonus so no ticket rots unclaimed. */
export const LEVELS: Record<TicketLevel, { base: number; th: string; en: string }> = {
  L1: { base: 150, th: "ตอบคำถามการใช้งาน", en: "Usage / how-to answer" },
  L2: { base: 400, th: "ต้องสืบหาสาเหตุ / ทดสอบ", en: "Needs investigation" },
  L3: { base: 800, th: "บั๊กจริง ส่งต่อทีม dev พร้อมวิธีทำซ้ำ", en: "Real bug + repro for dev" },
};

/** +20% for every 15 min a ticket sat unclaimed, capped at 2× */
export function bountyMultiplier(createdAt: string, claimedAt: string): number {
  const waitMin = Math.max(0, (new Date(claimedAt).getTime() - new Date(createdAt).getTime()) / 60000);
  return Math.min(2, 1 + 0.2 * Math.floor(waitMin / 15));
}

/** ฿ owed for a closed ticket — null until a level is set at close time */
export function payoutOf(t: Ticket): number | null {
  if (!t.level || !t.agent) return null;
  const mult = bountyMultiplier(t.at, t.agent.at);
  return Math.round((LEVELS[t.level].base * mult) / 10) * 10;
}

/** deterministic fold — first claim wins, later claims are ignored */
export function foldTickets(events: SupportEvent[]): Map<string, Ticket> {
  const map = new Map<string, Ticket>();
  for (const e of events) {
    if (e.t === "created") {
      if (map.has(e.id)) continue;
      map.set(e.id, {
        id: e.id, at: e.at,
        customer: { email: e.email, name: e.name, company: e.company },
        subject: e.subject, body: e.body, ctx: e.ctx ?? {},
        status: "open", messages: [], lastAt: e.at,
      });
      continue;
    }
    const t = map.get(e.id);
    if (!t) continue; // event for an unknown ticket — ignore
    if (e.t === "claimed") {
      if (t.agent) continue; // ← the race resolves here: first claim keeps it
      t.agent = { name: e.agentName, email: e.agentEmail, at: e.at };
      t.status = "claimed";
      t.lastAt = e.at;
    } else if (e.t === "msg") {
      t.messages.push({ at: e.at, from: e.from, name: e.name, text: e.text });
      t.lastAt = e.at;
    } else if (e.t === "closed") {
      t.status = "closed";
      t.closedAt = e.at;
      if (e.level) t.level = e.level;
      t.lastAt = e.at;
    } else if (e.t === "rated") {
      // last-wins so a customer can revise; only the customer can emit this
      t.rating = { stars: e.stars, comment: e.comment, at: e.at };
    } else if (e.t === "approved") {
      if (!t.approvedBy) t.approvedBy = e.by;
    }
  }
  return map;
}

export const TICKET_CATEGORIES: { id: string; th: string; en: string }[] = [
  { id: "usage", th: "ใช้งานไม่เป็น / มีคำถาม", en: "How do I use this?" },
  { id: "data", th: "ข้อมูลผิด / ไม่อัปเดต", en: "Wrong or stale data" },
  { id: "bug", th: "ระบบค้าง / ขึ้น error", en: "Something is broken" },
  { id: "device", th: "อุปกรณ์ / มิเตอร์ไม่ส่งข้อมูล", en: "Device not reporting" },
  { id: "other", th: "อื่นๆ", en: "Something else" },
];

export const newTicketId = () =>
  `TK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;
