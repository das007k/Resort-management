import { databaseError, getD1 } from "@/db/d1";

function reference(prefix: string) {
  return `${prefix}-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-6)}`;
}

export async function GET() {
  try {
    const result = await getD1().prepare(`
      SELECT p.id, p.reference, p.reservation_id AS reservationId, p.amount, p.method, p.status,
        p.created_at AS createdAt, p.paid_at AS paidAt, r.guest, r.unit
      FROM payments p JOIN reservations r ON r.id = p.reservation_id
      ORDER BY p.created_at DESC LIMIT 100
    `).all();
    return Response.json({ payments: result.results });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as { reservationId?: string; amount?: number; method?: string };
    if (!input.reservationId || !Number.isFinite(input.amount) || Number(input.amount) <= 0) {
      return Response.json({ error: "Reservation and payment amount are required." }, { status: 400 });
    }
    const db = getD1();
    const reservation = await db.prepare("SELECT id, amount, paid FROM reservations WHERE id = ?").bind(input.reservationId).first<{ id: string; amount: number; paid: number }>();
    if (!reservation) return Response.json({ error: "Reservation not found." }, { status: 404 });
    const balance = Math.max(0, reservation.amount - reservation.paid);
    if (balance === 0) return Response.json({ error: "This reservation is already fully paid." }, { status: 409 });
    const amount = Math.min(balance, Math.round(Number(input.amount)));
    const id = crypto.randomUUID(); const paymentReference = reference("PAY");
    await db.prepare(`
      INSERT INTO payments (id, reservation_id, reference, amount, method, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `).bind(id, reservation.id, paymentReference, amount, input.method?.trim() || "Payment link").run();
    const payment = await db.prepare(`
      SELECT id, reference, reservation_id AS reservationId, amount, method, status, created_at AS createdAt
      FROM payments WHERE id = ?
    `).bind(id).first();
    return Response.json({ payment }, { status: 201 });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) return Response.json({ error: "Payment request is required." }, { status: 400 });
    const db = getD1();
    const payment = await db.prepare(`
      SELECT id, reservation_id AS reservationId, amount, status FROM payments WHERE id = ?
    `).bind(id).first<{ id: string; reservationId: string; amount: number; status: string }>();
    if (!payment) return Response.json({ error: "Payment request not found." }, { status: 404 });
    const reservation = await db.prepare(`
      SELECT r.id, r.quote_id AS quoteId, r.guest, r.phone, r.unit, r.amount, r.paid,
        q.subtotal, q.accommodation_tax AS accommodationTax, q.service_tax AS serviceTax
      FROM reservations r LEFT JOIN quotes q ON q.id = r.quote_id WHERE r.id = ?
    `).bind(payment.reservationId).first<{ id: string; quoteId: string | null; guest: string; phone: string; unit: string; amount: number; paid: number; subtotal: number | null; accommodationTax: number | null; serviceTax: number | null }>();
    if (!reservation) return Response.json({ error: "Reservation not found." }, { status: 404 });
    if (payment.status !== "Paid") {
      const newPaid = Math.min(reservation.amount, reservation.paid + payment.amount);
      const operations = [
        db.prepare("UPDATE payments SET status = 'Paid', paid_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'Paid'").bind(id),
        db.prepare("UPDATE reservations SET paid = ? WHERE id = ?").bind(newPaid, reservation.id),
      ];
      if (newPaid >= reservation.amount) {
        const invoiceId = crypto.randomUUID(); const invoiceNo = reference("INV");
        const subtotal = reservation.subtotal ?? reservation.amount;
        const accommodationTax = reservation.accommodationTax ?? 0;
        const serviceTax = reservation.serviceTax ?? 0;
        operations.push(db.prepare(`
          INSERT OR IGNORE INTO invoices (
            id, reservation_id, invoice_no, guest, phone, items_json, subtotal,
            accommodation_tax, service_tax, total, paid, balance, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Final')
        `).bind(invoiceId, reservation.id, invoiceNo, reservation.guest, reservation.phone, JSON.stringify([{ description: reservation.unit, category: "accommodation", quantity: 1, rate: subtotal }]), subtotal, accommodationTax, serviceTax, reservation.amount, newPaid));
      }
      await db.batch(operations);
    }
    const updatedPayment = await db.prepare(`
      SELECT id, reference, reservation_id AS reservationId, amount, method, status,
        created_at AS createdAt, paid_at AS paidAt FROM payments WHERE id = ?
    `).bind(id).first();
    const updatedReservation = await db.prepare(`
      SELECT id, guest, phone, unit, check_in AS checkIn, check_out AS checkOut,
        source, amount, paid, status FROM reservations WHERE id = ?
    `).bind(payment.reservationId).first();
    const invoice = await db.prepare(`
      SELECT id, invoice_no AS invoiceNo, total, paid, balance, status FROM invoices WHERE reservation_id = ?
    `).bind(payment.reservationId).first();
    return Response.json({ payment: updatedPayment, reservation: updatedReservation, invoice });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}
