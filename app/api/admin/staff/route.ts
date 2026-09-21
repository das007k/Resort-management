import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../auth";

const roles = ["Admin", "Manager", "Front Desk", "Housekeeping", "Accounts", "Maintenance"];
export async function GET(request: Request) {
  try { const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity; const result = await getD1().prepare("SELECT id, email, full_name AS fullName, phone, role, status, created_at AS createdAt FROM staff_users ORDER BY full_name").all(); return Response.json({ staff: result.results }); }
  catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity;
    const input = await request.json() as Record<string, unknown>; const email = String(input.email || "").trim().toLowerCase(); const fullName = String(input.fullName || "").trim(); const role = String(input.role || "Front Desk");
    if (!/^\S+@\S+\.\S+$/.test(email) || !fullName || !roles.includes(role)) return Response.json({ error: "Valid name, email and role are required." }, { status: 400 });
    await getD1().prepare(`INSERT INTO staff_users (id, email, full_name, phone, role, status, created_by_email) VALUES (?, ?, ?, ?, ?, 'Active', ?) ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, phone=excluded.phone, role=excluded.role, status='Active', updated_at=CURRENT_TIMESTAMP`)
      .bind(crypto.randomUUID(), email, fullName, String(input.phone || ""), role, identity.email).run();
    return GET(request);
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
export async function PATCH(request: Request) {
  try { const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity; const input = await request.json() as { id?: string; status?: string }; if (!input.id || !["Active", "Suspended"].includes(input.status || "")) return Response.json({ error: "Valid staff status is required." }, { status: 400 }); await getD1().prepare("UPDATE staff_users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND email != ?").bind(input.status, input.id, identity.email).run(); return GET(request); }
  catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
