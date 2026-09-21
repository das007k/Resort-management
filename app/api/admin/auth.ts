import { getD1 } from "@/db/d1";

export type StaffIdentity = { email: string; role: string; fullName: string };

function currentEmail(request: Request) { return request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() ?? ""; }
function currentName(request: Request, email: string) {
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  if (encoded && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") { try { return decodeURIComponent(encoded); } catch { /* use email */ } }
  return email.split("@")[0] || "Administrator";
}

export async function requireStaff(request: Request, roles?: string[]): Promise<StaffIdentity | Response> {
  const email = currentEmail(request);
  if (!email) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const db = getD1();
  const count = await db.prepare("SELECT COUNT(*) AS count FROM staff_users").first<{ count: number }>();
  if (!count?.count) {
    await db.prepare(`INSERT INTO staff_users (id, email, full_name, role, status, created_by_email) VALUES (?, ?, ?, 'Admin', 'Active', ?)`)
      .bind(crypto.randomUUID(), email, currentName(request, email), email).run();
  }
  const staff = await db.prepare("SELECT email, role, full_name AS fullName FROM staff_users WHERE lower(email) = ? AND status = 'Active'").bind(email).first<StaffIdentity>();
  if (!staff) return Response.json({ error: "Your staff access is inactive or has not been created by an administrator." }, { status: 403 });
  if (roles && !roles.includes(staff.role)) return Response.json({ error: "Administrator permission is required." }, { status: 403 });
  return staff;
}
