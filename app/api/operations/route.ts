import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../admin/auth";

const allowedRoles = ["Admin", "Manager", "Front Desk", "Housekeeping", "Maintenance"];
const writeRoles: Record<string, string[]> = {
  Housekeeping: ["Admin", "Manager", "Front Desk", "Housekeeping"],
  Maintenance: ["Admin", "Manager", "Front Desk", "Maintenance"],
};
const statuses: Record<string, string[]> = {
  Housekeeping: ["Open", "In progress", "Ready", "Completed"],
  Maintenance: ["Open", "Assigned", "In progress", "Resolved"],
};

export async function GET(request: Request) {
  try {
    const identity = await requireStaff(request, allowedRoles); if (identity instanceof Response) return identity;
    const url = new URL(request.url); const type = url.searchParams.get("type");
    const query = type
      ? getD1().prepare("SELECT id, type, unit, title, priority, status, assignee, due_at AS dueAt, notes, created_by_email AS createdByEmail, created_at AS createdAt, updated_at AS updatedAt FROM operational_tasks WHERE type = ? ORDER BY CASE priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 ELSE 2 END, updated_at DESC").bind(type)
      : getD1().prepare("SELECT id, type, unit, title, priority, status, assignee, due_at AS dueAt, notes, created_by_email AS createdByEmail, created_at AS createdAt, updated_at AS updatedAt FROM operational_tasks ORDER BY updated_at DESC LIMIT 200");
    const result = await query.all(); return Response.json({ tasks: result.results });
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>; const type = String(input.type || "");
    if (!writeRoles[type]) return Response.json({ error: "Valid task type is required." }, { status: 400 });
    const identity = await requireStaff(request, writeRoles[type]); if (identity instanceof Response) return identity;
    const unit = String(input.unit || "").trim(); const title = String(input.title || "").trim();
    if (!unit || !title) return Response.json({ error: "Unit and task description are required." }, { status: 400 });
    const id = crypto.randomUUID(); const priority = ["Normal", "High", "Urgent"].includes(String(input.priority)) ? String(input.priority) : "Normal";
    await getD1().batch([
      getD1().prepare("INSERT INTO operational_tasks (id, type, unit, title, priority, status, assignee, due_at, notes, created_by_email) VALUES (?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?)").bind(id, type, unit, title, priority, String(input.assignee || ""), input.dueAt ? String(input.dueAt) : null, String(input.notes || ""), identity.email),
      getD1().prepare("INSERT INTO activity_logs (id, actor_email, action, entity_type, entity_id, detail) VALUES (?, ?, 'Created', 'OperationalTask', ?, ?)").bind(crypto.randomUUID(), identity.email, id, `${type}: ${title}`),
    ]);
    return GET(new Request(`${new URL(request.url).origin}/api/operations?type=${encodeURIComponent(type)}`, { headers: request.headers }));
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const input = await request.json() as { id?: string; status?: string; assignee?: string };
    if (!input.id) return Response.json({ error: "Task is required." }, { status: 400 });
    const db = getD1(); const task = await db.prepare("SELECT id, type, status FROM operational_tasks WHERE id = ?").bind(input.id).first<{ id: string; type: string; status: string }>();
    if (!task) return Response.json({ error: "Task not found." }, { status: 404 });
    const identity = await requireStaff(request, writeRoles[task.type] ?? ["Admin", "Manager"]); if (identity instanceof Response) return identity;
    const status = input.status ?? task.status; if (!statuses[task.type]?.includes(status)) return Response.json({ error: "Invalid workflow status." }, { status: 400 });
    await db.batch([
      db.prepare("UPDATE operational_tasks SET status = ?, assignee = COALESCE(?, assignee), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, input.assignee ?? null, task.id),
      db.prepare("INSERT INTO activity_logs (id, actor_email, action, entity_type, entity_id, detail) VALUES (?, ?, 'Status changed', 'OperationalTask', ?, ?)").bind(crypto.randomUUID(), identity.email, task.id, `${task.status} → ${status}`),
    ]);
    return GET(new Request(`${new URL(request.url).origin}/api/operations?type=${encodeURIComponent(task.type)}`, { headers: request.headers }));
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
