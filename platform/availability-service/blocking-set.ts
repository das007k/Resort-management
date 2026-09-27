import { linkedInventoryRepository } from "@/domains/inventory/repositories/linked-inventory-repository";
import type { DbExecutor } from "@/platform/db/types";

export interface BookingSets {
  /**
   * Units that get an actual `reservation_units` row written (and are the
   * ones checked for existing overlaps via that same write). This is the
   * concurrency-critical set — see the asymmetry note below.
   */
  writeSet: string[];
  /**
   * Units whose CURRENT STATUS (OUT_OF_ORDER / INACTIVE) must block this
   * booking. Deliberately a separate, slightly larger set than `writeSet`
   * in one case: a child (bedroom) booking must also refuse to proceed if
   * the PARENT (whole-cottage) unit itself is marked out of order — a
   * structural issue affecting the whole building should block every
   * bedroom — without writing a row keyed by the parent (which would
   * reintroduce the two-different-bedrooms-collide bug; see below).
   */
  statusCheckSet: string[];
}

/**
 * Computes the write set and status-check set for booking `unitId`, per the
 * linked-inventory rules (mandatory principle §6):
 *
 *   - Booking the whole-cottage (PARENT) unit writes/checks a row for the
 *     parent itself AND every bedroom (child) unit in its group — because
 *     selling the whole cottage physically occupies every bedroom.
 *   - Booking a bedroom (CHILD) unit, when the group allows separate sale,
 *     writes a row ONLY for that bedroom's own unit id — NOT the parent's.
 *     This asymmetry is deliberate: if a child booking also wrote a row
 *     keyed by the parent's unit id, two DIFFERENT bedrooms booked for the
 *     same dates would both try to write that same parent-keyed row and
 *     incorrectly collide with EACH OTHER, even though the two bedrooms
 *     don't physically overlap.
 *   - Booking a bedroom when the group does NOT allow separate sale
 *     (`allowSeparateSale: false`) is treated exactly like booking the
 *     parent: it writes/checks the whole group, so a second bedroom cannot
 *     be independently booked while this one is held.
 *
 * The parent unit is still correctly seen as unavailable whenever any one
 * bedroom is booked (with separate sale allowed), because checking/booking
 * the PARENT always includes every child's unit id in its own write set —
 * so it will always see a child's OCCUPIED row if one exists.
 *
 * The status-check set additionally includes the parent for a
 * separate-sale-allowed child booking (read-only — no row is written for
 * it), so an out-of-order PARENT blocks every bedroom too. A unit that
 * isn't part of any linked-inventory group only ever touches itself.
 */
export async function computeBookingSets(executor: DbExecutor, unitId: string): Promise<BookingSets> {
  const membership = await linkedInventoryRepository.findMembership(executor, unitId);
  if (!membership) return { writeSet: [unitId], statusCheckSet: [unitId] };

  const allMembers = await linkedInventoryRepository.allMemberUnitIds(executor, membership.groupId);
  const wholeGroupSet = Array.from(new Set([unitId, ...allMembers]));

  if (membership.isParent) {
    return { writeSet: wholeGroupSet, statusCheckSet: wholeGroupSet };
  }

  const group = await linkedInventoryRepository.findGroupForUnit(executor, unitId);
  if (group && !group.allowSeparateSale) {
    // Separate sale disabled: a bedroom booking behaves exactly like a
    // whole-cottage booking for both concurrency and status purposes.
    return { writeSet: wholeGroupSet, statusCheckSet: wholeGroupSet };
  }

  // Separate sale allowed: only this bedroom's row is written, but the
  // parent's status is still checked (read-only).
  const parentUnitId = await linkedInventoryRepository.findParentUnitId(executor, membership.groupId);
  return {
    writeSet: [unitId],
    statusCheckSet: parentUnitId ? [unitId, parentUnitId] : [unitId],
  };
}
