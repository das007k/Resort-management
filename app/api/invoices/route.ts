import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../admin/auth";

const financeRoles = ["Admin", "Manager", "Front Desk", "Accounts"];

function invoiceNumber() {
  return `INV-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-6)}`;
}

export async function GET(request: Request) {
  try {
    const identity = await requireStaff(request, financeRoles); if (identity instanceof Response) return identity;
    const result = await getD1().prepare(`
      SELECT id, reservation_id AS reservationId, invoice_no AS invoiceNo, guest, phone,
        items_json AS itemsJson, subtotal, accommodation_tax AS accommodationTax,
        service_tax AS serviceTax, total, paid, balance, status, issued_at AS issuedAt
      FROM invoices ORDER BY issued_at DESC LIMIT 100
    `).all();
    return Response.json({ invoices: result.results });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireStaff(request, financeRoles); if (identity instanceof Response) return identity;
    const input = (await request.json()) as { reservationId?: string; items?: unknown[]; subtotal?: number; accommodationTax?: number; serviceTax?: number; total?: number };
    if (!input.reservationId) return Response.json({ error: "Select a saved reservation." }, { status: 400 });
    const db = getD1();
    const reservation = await db.prepare("SELECT id, guest, phone, amount, paid, unit FROM reservations WHERE id = ?").bind(input.reservationId).first<{ id: string; guest: string; phone: string; amount: number; paid: number; unit: string }>();
    if (!reservation) return Response.json({ error: "Reservation not found." }, { status: 404 });
    const existing = await db.prepare(`
      SELECT id, invoice_no AS invoiceNo, total, paid, balance, status FROM invoices WHERE reservation_id = ?
    `).bind(reservation.id).first();
    if (existing) return Response.json({ invoice: existing });
    const id = crypto.randomUUID(); const invoiceNo = invoiceNumber();
    const total = Math.max(0, Math.round(input.total ?? reservation.amount));
    const paid = Math.min(total, reservation.paid); const balance = Math.max(0, total - paid);
    await db.prepare(`
      INSERT INTO invoices (
        id, reservation_id, invoice_no, guest, phone, items_json, subtotal,
        accommodation_tax, service_tax, total, paid, balance, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Final')
    `).bind(id, reservation.id, invoiceNo, reservation.guest, reservation.phone, JSON.stringify(input.items ?? [{ description: reservation.unit, category: "accommodation", quantity: 1, rate: total }]), Math.max(0, Math.round(input.subtotal ?? total)), Math.max(0, Math.round(input.accommodationTax ?? 0)), Math.max(0, Math.round(input.serviceTax ?? 0)), total, paid, balance).run();
    const invoice = await db.prepare(`
      SELECT id, reservation_id AS reservationId, invoice_no AS invoiceNo, guest, phone,
        items_json AS itemsJson, subtotal, accommodation_tax AS accommodationTax,
        service_tax AS serviceTax, total, paid, balance, status, issued_at AS issuedAt
      FROM invoices WHERE id = ?
    `).bind(id).first();
    return Response.json({ invoice }, { status: 201 });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}
