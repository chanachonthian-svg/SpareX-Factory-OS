import type { Queryable } from "../db/pool.js";
import type { AnthropicContentBlock, AnthropicMessage } from "./anthropic.js";

export async function ensureSession(db: Queryable, sessionId: string) {
  await db.query(
    `INSERT INTO copilot_sessions (session_id)
     VALUES ($1)
     ON CONFLICT (session_id) DO UPDATE SET updated_at = now()`,
    [sessionId],
  );
}

export async function loadSessionMessages(db: Queryable, sessionId: string, limit = 30): Promise<AnthropicMessage[]> {
  const res = await db.query(
    `SELECT role, content
     FROM copilot_messages
     WHERE session_id = $1
     ORDER BY id DESC
     LIMIT $2`,
    [sessionId, limit],
  );

  return res.rows.reverse().map((row) => ({
    role: row.role,
    content: row.content,
  }));
}

export async function saveSessionMessage(db: Queryable, sessionId: string, role: "user" | "assistant", content: AnthropicContentBlock[]) {
  await ensureSession(db, sessionId);
  await db.query(
    `INSERT INTO copilot_messages (session_id, role, content)
     VALUES ($1, $2, $3::jsonb)`,
    [sessionId, role, JSON.stringify(content)],
  );
}
