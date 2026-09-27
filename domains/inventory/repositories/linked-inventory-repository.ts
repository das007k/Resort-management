import { and, eq } from "drizzle-orm";
import { linkedInventoryGroups, linkedInventoryMembers } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";

export const linkedInventoryRepository = {
  async createGroup(executor: DbExecutor, input: { propertyId: string; name: string; allowSeparateSale: boolean }) {
    const [row] = await executor.insert(linkedInventoryGroups).values(input).returning();
    return row!;
  },

  async addMember(
    executor: DbExecutor,
    input: { propertyId: string; groupId: string; unitId: string; isParent: boolean },
  ) {
    const [row] = await executor.insert(linkedInventoryMembers).values(input).returning();
    return row!;
  },

  /** All units in the same linked-inventory group as `unitId`, including itself. */
  async siblingUnitIds(executor: DbExecutor, unitId: string): Promise<string[]> {
    const [membership] = await executor
      .select()
      .from(linkedInventoryMembers)
      .where(eq(linkedInventoryMembers.unitId, unitId))
      .limit(1);

    if (!membership) return [unitId]; // not part of a linked group — only itself

    const members = await executor
      .select()
      .from(linkedInventoryMembers)
      .where(eq(linkedInventoryMembers.groupId, membership.groupId));

    return members.map((m) => m.unitId);
  },

  /** The membership row (group + isParent) for a unit, or null if it isn't part of a linked group. */
  async findMembership(executor: DbExecutor, unitId: string) {
    const [row] = await executor
      .select()
      .from(linkedInventoryMembers)
      .where(eq(linkedInventoryMembers.unitId, unitId))
      .limit(1);
    return row ?? null;
  },

  async findParentUnitId(executor: DbExecutor, groupId: string): Promise<string | null> {
    const [row] = await executor
      .select()
      .from(linkedInventoryMembers)
      .where(and(eq(linkedInventoryMembers.groupId, groupId), eq(linkedInventoryMembers.isParent, true)))
      .limit(1);
    return row?.unitId ?? null;
  },

  async allMemberUnitIds(executor: DbExecutor, groupId: string): Promise<string[]> {
    const rows = await executor.select().from(linkedInventoryMembers).where(eq(linkedInventoryMembers.groupId, groupId));
    return rows.map((r) => r.unitId);
  },

  async findGroupForUnit(executor: DbExecutor, unitId: string) {
    const [membership] = await executor
      .select()
      .from(linkedInventoryMembers)
      .where(eq(linkedInventoryMembers.unitId, unitId))
      .limit(1);
    if (!membership) return null;
    const [group] = await executor
      .select()
      .from(linkedInventoryGroups)
      .where(eq(linkedInventoryGroups.id, membership.groupId))
      .limit(1);
    return group ?? null;
  },
};
