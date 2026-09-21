import { env } from "cloudflare:workers";

export function getD1(): D1Database {
  if (!env.DB) throw new Error("StayAxis database is temporarily unavailable.");
  return env.DB;
}

export function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected database error";
  if (message.includes("no such table")) return "StayAxis is completing its data setup. Please try again shortly.";
  return message;
}
