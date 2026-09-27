import type { db } from "@/platform/db/client";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type * as schema from "@/platform/db/schema";

/**
 * Domain services accept either the top-level `db` handle or an open
 * transaction (`tx`) so the SAME service function can be called standalone
 * or composed inside a larger transaction (e.g. the availability service
 * calling the audit service inside its own booking transaction).
 */
export type DbExecutor =
  | typeof db
  | PgTransaction<NodePgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;
