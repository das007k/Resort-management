import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../admin/auth";

const salesRoles = ["Admin", "Manager", "Front Desk"];

type QuoteInput = {
  guest?: string; phone?: string; checkIn?: string; checkOut?: string; unit?: string;
  adults?: number; olderChildren?: number; youngChildren?: number; mealPlan?: string;
  services?: { id: string; name: string; quantity: number; amount: number }[];
  subtotal?: number; discount?: number; tax?: number; accommodationTax?: number; serviceTax?: number; total?: number;
};

function quoteNumber() {
  return `CRR-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-6)}`;
}

function reservationNumber() {
  return `STX-${Date.now().toString().slice(-6)}`;
}

export async function GET(request: Request) {
  try {
    const identity = await requireStaff(request, salesRoles); if (identity instanceof Response) return identity;
    const result = await getD1().prepare(`
      SELECT id, quote_no AS quoteNo, guest, phone, check_in AS checkIn, check_out AS checkOut,
        unit, adults, older_children AS olderChildren, young_children AS youngChildren,
        meal_plan AS mealPlan, subtotal, discount, tax, total, status, created_at AS createdAt
      FROM quotes ORDER BY created_at DESC LIMIT 20
    `).all();
    return Response.json({ quotes: result.results });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireStaff(request, salesRoles); if (identity instanceof Response) return identity;
    const input = (await request.json()) as QuoteInput;
    if (!input.guest?.trim() || !input.checkIn || !input.checkOut || !input.unit) {
      return Response.json({ error: "Guest, dates and accommodation are required." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const quoteNo = quoteNumber();
    const db = getD1();
    await db.prepare(`
      INSERT INTO quotes (
        id, quote_no, guest, phone, check_in, check_out, unit, adults, older_children,
        young_children, meal_plan, services_json, subtotal, discount, tax,
        accommodation_tax, service_tax, total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Sent')
    `).bind(
      id, quoteNo, input.guest.trim(), input.phone?.trim() ?? "", input.checkIn, input.checkOut,
      input.unit, Math.max(1, Number(input.adults ?? 1)), Math.max(0, Number(input.olderChildren ?? 0)),
      Math.max(0, Number(input.youngChildren ?? 0)), input.mealPlan ?? "Room only",
      JSON.stringify(input.services ?? []), Math.max(0, Math.round(input.subtotal ?? 0)),
      Math.max(0, Math.round(input.discount ?? 0)), Math.max(0, Math.round(input.tax ?? 0)),
      Math.max(0, Math.round(input.accommodationTax ?? 0)), Math.max(0, Math.round(input.serviceTax ?? 0)),
      Math.max(0, Math.round(input.total ?? 0)),
    ).run();
    const quote = await db.prepare(`
      SELECT id, quote_no AS quoteNo, guest, phone, check_in AS checkIn, check_out AS checkOut,
        unit, total, status, created_at AS createdAt FROM quotes WHERE id = ?
    `).bind(id).first();
    return Response.json({ quote }, { status: 201 });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const identity = await requireStaff(request, salesRoles); if (identity instanceof Response) return identity;
    const { id, action } = (await request.json()) as { id?: string; action?: string };
    if (!id || action !== "convert") return Response.json({ error: "A valid conversion request is required." }, { status: 400 });
    const db = getD1();
    const quote = await db.prepare(`
      SELECT id, guest, phone, unit, check_in AS checkIn, check_out AS checkOut, total, status
      FROM quotes WHERE id = ?
    `).bind(id).first<{ id: string; guest: string; phone: string; unit: string; checkIn: string; checkOut: string; total: number; status: string }>();
    if (!quote) return Response.json({ error: "Quotation not found." }, { status: 404 });

    let reservation = await db.prepare(`
      SELECT id, guest, phone, unit, check_in AS checkIn, check_out AS checkOut,
        source, amount, paid, status FROM reservations WHERE quote_id = ?
    `).bind(id).first();

    if (!reservation) {
      const reservationId = reservationNumber();
      await db.batch([
        db.prepare(`
          INSERT INTO reservations (id, quote_id, guest, phone, unit, check_in, check_out, source, amount, paid, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Direct', ?, 0, 'Confirmed')
        `).bind(reservationId, id, quote.guest, quote.phone, quote.unit, quote.checkIn, quote.checkOut, quote.total),
        db.prepare("UPDATE quotes SET status = 'Converted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
      ]);
      reservation = await db.prepare(`
        SELECT id, guest, phone, unit, check_in AS checkIn, check_out AS checkOut,
          source, amount, paid, status FROM reservations WHERE quote_id = ?
      `).bind(id).first();
    }
    return Response.json({ reservation });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}
