import "server-only";
import { appendFile, readFile } from "fs/promises";
import type { SupportEvent } from "./support";

/** Server-side event log for support tickets. Kept out of lib/support.ts so the
 *  client can import the types/fold without pulling in fs. */
const FILE = process.env.SUPPORT_FILE || "/opt/factoryos-support.ndjson";

export async function readEvents(): Promise<SupportEvent[]> {
  try {
    const txt = await readFile(FILE, "utf8");
    return txt.split("\n").filter(Boolean)
      .map((l) => { try { return JSON.parse(l) as SupportEvent; } catch { return null; } })
      .filter(Boolean) as SupportEvent[];
  } catch { return []; }
}

export async function writeEvent(e: SupportEvent): Promise<boolean> {
  try { await appendFile(FILE, JSON.stringify(e) + "\n", "utf8"); return true; } catch { return false; }
}
