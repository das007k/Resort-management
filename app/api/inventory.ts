type UnitRow = { id: string; name: string; parent: string | null };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateStay(checkIn: string, checkOut: string) {
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) return "Use valid check-in and check-out dates.";
  if (checkIn >= checkOut) return "Check-out must be after check-in.";
  return null;
}

export async function assertAvailability(db: D1Database, unitName: string, checkIn: string, checkOut: string) {
  const requested = await db.prepare("SELECT id, name, parent_id AS parent FROM accommodation_units WHERE name = ? AND active = 1").bind(unitName).first<UnitRow>();
  if (!requested) throw new Error("Selected accommodation is not active or does not exist.");
  const related = requested.parent
    ? await db.prepare("SELECT id, name, parent_id AS parent FROM accommodation_units WHERE id = ? OR parent_id = ?").bind(requested.parent, requested.parent).all<UnitRow>()
    : await db.prepare("SELECT id, name, parent_id AS parent FROM accommodation_units WHERE id = ? OR parent_id = ?").bind(requested.id, requested.id).all<UnitRow>();
  const names = [...new Set([requested.name, ...related.results.map((row) => row.name)])];
  const placeholders = names.map(() => "?").join(", ");
  const conflict = await db.prepare(`SELECT id, guest, unit, check_in AS checkIn, check_out AS checkOut
    FROM reservations WHERE unit IN (${placeholders}) AND status NOT IN ('Cancelled', 'Checked out')
      AND check_in < ? AND check_out > ? LIMIT 1`).bind(...names, checkOut, checkIn).first<{ id: string; unit: string; checkIn: string; checkOut: string }>();
  if (conflict) throw new Error(`${conflict.unit} is already reserved from ${conflict.checkIn} to ${conflict.checkOut} (${conflict.id}).`);
}

export function isAvailabilityConflict(error: unknown) {
  return error instanceof Error && (error.message.includes("already reserved") || error.message.includes("not active"));
}
