import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../admin/auth";

const roles = ["Admin", "Manager", "Front Desk"];
export async function GET(request: Request) {
  try {
    const identity = await requireStaff(request, roles); if (identity instanceof Response) return identity;
    const result = await getD1().prepare("SELECT id, guest, phone, unit, check_in AS checkIn, check_out AS checkOut, source, amount, paid, status FROM reservations WHERE status != 'Cancelled' ORDER BY check_in, guest").all();
    return Response.json({ reservations: result.results });
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const identity = await requireStaff(request, roles); if (identity instanceof Response) return identity;
    const input = await request.json() as { id?: string; action?: "check-in" | "check-out" | "cancel" | "no-show" };
    if (!input.id || !input.action) return Response.json({ error: "Reservation and action are required." }, { status: 400 });
    const db = getD1(); const reservation = await db.prepare("SELECT id, guest, amount, paid, status FROM reservations WHERE id = ?").bind(input.id).first<{ id: string; guest: string; amount: number; paid: number; status: string }>();
    if (!reservation) return Response.json({ error: "Reservation not found." }, { status: 404 });
    const nextStatus = input.action === "check-in" ? "Checked in" : input.action === "check-out" ? "Checked out" : input.action === "no-show" ? "No show" : "Cancelled";
    if (input.action === "check-in" && reservation.status !== "Confirmed") return Response.json({ error: "Only confirmed reservations can be checked in." }, { status: 409 });
    if (input.action === "check-out" && reservation.status !== "Checked in") return Response.json({ error: "Only in-house guests can be checked out." }, { status: 409 });
    if (input.action === "check-out" && reservation.paid < reservation.amount) return Response.json({ error: `Collect the remaining balance of ₹${(reservation.amount - reservation.paid).toLocaleString("en-IN")} before checkout.` }, { status: 409 });
    await db.batch([
      db.prepare("UPDATE reservations SET status = ?, channel_status = ?, last_modified_at = CURRENT_TIMESTAMP WHERE id = ?").bind(nextStatus, input.action === "cancel" ? "Cancelled" : input.action === "no-show" ? "No show" : "Modified", reservation.id),
      db.prepare("INSERT INTO activity_logs (id, actor_email, action, entity_type, entity_id, detail) VALUES (?, ?, ?, 'Reservation', ?, ?)").bind(crypto.randomUUID(), identity.email, nextStatus, reservation.id, reservation.guest),
      db.prepare("INSERT INTO reservation_events (id, reservation_id, event_type, source, external_event_id, payload_json, acknowledgement_status, processed_by_email) VALUES (?, ?, ?, 'StayAxis', ?, ?, 'Not required', ?)").bind(crypto.randomUUID(), reservation.id, nextStatus, crypto.randomUUID(), JSON.stringify({ previousStatus: reservation.status, nextStatus }), identity.email),
    ]);
    return GET(request);
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
