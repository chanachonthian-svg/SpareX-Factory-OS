import pg from "pg";
import { config } from "../config.js";

export type Queryable = Pick<pg.Pool, "query">;

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

export async function closePool() {
  await pool.end();
}
