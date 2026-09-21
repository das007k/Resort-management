import { databaseError, getD1 } from "@/db/d1";

export async function GET() {
  try {
    const result = await getD1().prepare(`
      SELECT id, guest, phone, unit, check_in AS checkIn, check_out AS checkOut,
        source, amount, paid, status FROM reservations ORDER BY created_at DESC LIMIT 100
    `).all();
    return Response.json({ reservations: result.results });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as { guest?: string; phone?: string; unit?: string; checkIn?: string; checkOut?: string; amount?: number };
    if (!input.guest?.trim() || !input.unit || !input.checkIn || !input.checkOut) {
      return Response.json({ error: "Guest, dates and accommodation are required." }, { status: 400 });
    }
    const id = `STX-${Date.now().toString().slice(-6)}`;
    const db = getD1();
    await db.prepare(`
      INSERT INTO reservations (id, guest, phone, unit, check_in, check_out, source, amount, paid, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Direct', ?, 0, 'Pending')
    `).bind(id, input.guest.trim(), input.phone?.trim() ?? "", input.unit, input.checkIn, input.checkOut, Math.max(0, Math.round(input.amount ?? 0))).run();
    const reservation = await db.prepare(`
      SELECT id, guest, phone, unit, check_in AS checkIn, check_out AS checkOut,
        source, amount, paid, status FROM reservations WHERE id = ?
    `).bind(id).first();
    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}
