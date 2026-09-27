import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/platform/db/schema";
import { getEnv } from "@/platform/config/env";

const env = getEnv();

// A single pooled connection shared across the process. Next.js dev-mode
// hot-reload can otherwise leak pools across module reloads, so we stash
// the pool on globalThis in development.
const globalForDb = globalThis as unknown as { __stayaxisPool?: Pool };

export const pool =
  globalForDb.__stayaxisPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: env.NODE_ENV === "test" ? 5 : 10,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.__stayaxisPool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;
