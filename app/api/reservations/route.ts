import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../admin/auth";
import { assertAvailability, isAvailabilityConflict, validateStay } from "../inventory";

const reservationRoles = ["Admin", "Manager", "Front Desk", "Accounts"];

export async function GET(request: Request) {
  try {
    const identity = await requireStaff(request, reservationRoles); if (identity instanceof Response) return identity;
    const result = await getD1().prepare(`
      SELECT id, guest, phone, guest_email AS guestEmail, guest_country AS guestCountry, unit, check_in AS checkIn, check_out AS checkOut,
        source, amount, paid, status, channel_reservation_id AS channelReservationId, channel_status AS channelStatus,
        acknowledgement_status AS acknowledgementStatus, adults, children, children_ages_json AS childrenAgesJson,
        rate_plan AS ratePlan, meal_plan AS mealPlan, currency, taxes, fees, commission, payment_model AS paymentModel,
        guarantee_status AS guaranteeStatus, cancellation_policy AS cancellationPolicy, cancellation_deadline AS cancellationDeadline,
        special_requests AS specialRequests, arrival_time AS arrivalTime, last_modified_at AS lastModifiedAt
      FROM reservations ORDER BY created_at DESC LIMIT 100
    `).all();
    return Response.json({ reservations: result.results });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireStaff(request, ["Admin", "Manager", "Front Desk"]); if (identity instanceof Response) return identity;
    const input = (await request.json()) as { guest?: string; phone?: string; guestEmail?: string; guestCountry?: string; unit?: string; checkIn?: string; checkOut?: string; amount?: number; source?: string; channelReservationId?: string; adults?: number; children?: number; childrenAges?: number[]; ratePlan?: string; mealPlan?: string; currency?: string; taxes?: number; fees?: number; commission?: number; paymentModel?: string; guaranteeStatus?: string; cancellationPolicy?: string; cancellationDeadline?: string; specialRequests?: string; arrivalTime?: string };
    if (!input.guest?.trim() || !input.unit || !input.checkIn || !input.checkOut) {
      return Response.json({ error: "Guest, dates and accommodation are required." }, { status: 400 });
    }
    const invalidStay = validateStay(input.checkIn, input.checkOut);
    if (invalidStay) return Response.json({ error: invalidStay }, { status: 400 });
    const id = `STX-${Date.now().toString().slice(-6)}`;
    const db = getD1();
    await assertAvailability(db, input.unit, input.checkIn, input.checkOut);
    const source = ["Direct", "Booking.com", "Agoda", "MakeMyTrip", "Walk-in"].includes(String(input.source)) ? String(input.source) : "Direct";
    await db.batch([
      db.prepare(`INSERT INTO reservations (id, guest, phone, guest_email, guest_country, unit, check_in, check_out, source, amount, paid, status, channel_reservation_id, channel_status, acknowledgement_status, adults, children, children_ages_json, rate_plan, meal_plan, currency, taxes, fees, commission, payment_model, guarantee_status, cancellation_policy, cancellation_deadline, special_requests, arrival_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, 'New', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, input.guest.trim(), input.phone?.trim() ?? "", input.guestEmail?.trim() ?? "", input.guestCountry?.trim() ?? "", input.unit, input.checkIn, input.checkOut, source, Math.max(0, Math.round(input.amount ?? 0)), input.channelReservationId?.trim() ?? "", source === "Direct" || source === "Walk-in" ? "Not required" : "Pending", Math.max(1, Number(input.adults ?? 1)), Math.max(0, Number(input.children ?? 0)), JSON.stringify(input.childrenAges ?? []), input.ratePlan?.trim() || "Standard", input.mealPlan?.trim() || "Room only", input.currency?.trim() || "INR", Math.max(0, Math.round(input.taxes ?? 0)), Math.max(0, Math.round(input.fees ?? 0)), Math.max(0, Math.round(input.commission ?? 0)), input.paymentModel?.trim() || "Pay at property", input.guaranteeStatus?.trim() || "Not guaranteed", input.cancellationPolicy?.trim() ?? "", input.cancellationDeadline || null, input.specialRequests?.trim() ?? "", input.arrivalTime || null),
      db.prepare(`INSERT INTO reservation_events (id, reservation_id, event_type, source, external_event_id, payload_json, acknowledgement_status, processed_by_email) VALUES (?, ?, 'Created', ?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), id, source, input.channelReservationId?.trim() || id, JSON.stringify({ checkIn: input.checkIn, checkOut: input.checkOut, unit: input.unit, amount: input.amount }), source === "Direct" || source === "Walk-in" ? "Not required" : "Pending", identity.email),
    ]);
    const reservation = await db.prepare(`
      SELECT id, guest, phone, unit, check_in AS checkIn, check_out AS checkOut,
        source, amount, paid, status FROM reservations WHERE id = ?
    `).bind(id).first();
    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: isAvailabilityConflict(error) ? 409 : 500 });
  }
}
