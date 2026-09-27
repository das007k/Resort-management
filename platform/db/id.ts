import { randomUUID } from "node:crypto";

/**
 * Stable unique ID generator for all entities (mandatory principle: every
 * important record has a stable unique ID). Using UUID v4 via Node's
 * built-in crypto — no external dependency, cryptographically random.
 */
export function createId(): string {
  return randomUUID();
}
