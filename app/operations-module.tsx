"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, CheckCircle2, Clock3, Plus, RefreshCw, ShieldAlert, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, Reservation, Unit } from "./domain";

type TaskType = "Housekeeping" | "Maintenance";
type OperationsTask = { id: string; type: TaskType; unit: string; title: string; priority: string; status: string; assignee: string; dueAt?: string | null; notes: string; updatedAt: string };

export function FrontDeskOperations({ onNotice, onReservationsChanged }: { onNotice: (value: string) => void; onReservationsChanged: () => Promise<void> }) {
  const [reservations, setReservations] = useState<Reservation[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  const flash = (message: string) => { onNotice(message); window.setTimeout(() => onNotice(""), 4200); };
  const load = async () => { const response = await fetch("/api/frontdesk", { cache: "no-store" }); const data = await response.json() as { reservations?: Reservation[]; error?: string }; if (!response.ok) { setError(data.error || "Unable to load front desk."); return; } setError(""); setReservations(data.reservations ?? []); };
  // Initial synchronization with the operational ledger.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);
  const act = async (reservation: Reservation, action: "check-in" | "check-out" | "cancel" | "no-show") => { setBusy(reservation.id); try { const response = await fetch("/api/frontdesk", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: reservation.id, action }) }); const data = await response.json() as { reservations?: Reservation[]; error?: string }; if (!response.ok) throw new Error(data.error || "Unable to update reservation."); setReservations(data.reservations ?? []); await onReservationsChanged(); flash(`${reservation.guest} ${action === "check-in" ? "checked in" : action === "check-out" ? "checked out" : "cancelled"}.`); } catch (caught) { flash(caught instanceof Error ? caught.message : "Unable to update reservation."); } finally { setBusy(""); } };
  const lanes = useMemo(() => [
    { title: "Arrivals", status: "Confirmed", icon: UserCheck, action: "check-in" as const, label: "Check in" },
    { title: "In house", status: "Checked in", icon: BedDouble, action: "check-out" as const, label: "Settle & check out" },
    { title: "Completed", status: "Checked out", icon: CheckCircle2, action: null, label: "Completed" },
  ], []);
  if (error) return <AccessError message={error} />;
  return <><Header eyebrow="Operations" title="Front desk" description="Run check-in and checkout against the live reservation and payment ledger." action={<Button variant="outline" onClick={() => void load()}><RefreshCw /> Refresh</Button>} /><div className="grid gap-5 xl:grid-cols-3">{lanes.map((lane) => { const items = reservations.filter((item) => item.status === lane.status); return <section key={lane.status} className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b p-5"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#003b95]"><lane.icon className="size-5" /></span><div><h2 className="font-bold">{lane.title}</h2><p className="text-sm text-slate-500">{items.length} reservation{items.length === 1 ? "" : "s"}</p></div></div><div className="divide-y">{items.map((item) => <div key={item.id} className="p-5"><div className="flex items-start justify-between gap-3"><span><strong className="block text-sm">{item.guest}</strong><span className="text-xs text-slate-500">{item.id} · {item.unit}</span></span><Badge variant="outline">{item.status}</Badge></div><div className="mt-4 flex items-end justify-between gap-3"><span className="text-xs text-slate-500">{item.checkIn} → {item.checkOut}<strong className={`mt-1 block text-sm ${item.paid < item.amount ? "text-rose-600" : "text-emerald-700"}`}>{item.paid < item.amount ? `${money(item.amount - item.paid)} due` : "Paid in full"}</strong></span>{lane.action && <Button size="sm" className="bg-[#003b95]" disabled={busy === item.id} onClick={() => void act(item, lane.action!)}>{lane.label}</Button>}</div></div>)}{items.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No reservations in this stage.</p>}</div></section>; })}</div></>;
}

export function HousekeepingOperations({ onNotice }: { onNotice: (value: string) => void }) { return <TaskBoard type="Housekeeping" onNotice={onNotice} />; }
export function MaintenanceOperations({ onNotice }: { onNotice: (value: string) => void }) { return <TaskBoard type="Maintenance" onNotice={onNotice} />; }

function TaskBoard({ type, onNotice }: { type: TaskType; onNotice: (value: string) => void }) {
  const [tasks, setTasks] = useState<OperationsTask[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const isHousekeeping = type === "Housekeeping";
  const [units, setUnits] = useState<Unit[]>([]);
  const statuses = isHousekeeping ? ["Open", "In progress", "Ready", "Completed"] : ["Open", "Assigned", "In progress", "Resolved"];
  const load = useCallback(async () => { const [response, configurationResponse] = await Promise.all([fetch(`/api/operations?type=${type}`, { cache: "no-store" }), fetch("/api/configuration", { cache: "no-store" })]); const data = await response.json() as { tasks?: OperationsTask[]; error?: string }; const configuration = await configurationResponse.json() as { units?: Unit[] }; if (!response.ok) { setError(data.error || `Unable to load ${type.toLowerCase()}.`); return; } setError(""); setTasks(data.tasks ?? []); if (configurationResponse.ok) setUnits((configuration.units ?? []).filter((unit) => unit.active !== false)); }, [type]);
  // Initial synchronization with the operational ledger.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const flash = (message: string) => { onNotice(message); window.setTimeout(() => onNotice(""), 4200); };
  const create = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); try { const response = await fetch("/api/operations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, ...Object.fromEntries(form) }) }); const data = await response.json() as { tasks?: OperationsTask[]; error?: string }; if (!response.ok) throw new Error(data.error || "Unable to create task."); setTasks(data.tasks ?? []); event.currentTarget.reset(); flash(`${type} task created.`); } catch (caught) { flash(caught instanceof Error ? caught.message : "Unable to create task."); } finally { setBusy(false); } };
  const move = async (task: OperationsTask, status: string) => { const response = await fetch("/api/operations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, status }) }); const data = await response.json() as { tasks?: OperationsTask[]; error?: string }; if (!response.ok) { flash(data.error || "Unable to update task."); return; } setTasks(data.tasks ?? []); flash(`${task.unit} moved to ${status.toLowerCase()}.`); };
  if (error) return <AccessError message={error} />;
  return <>
    <Header eyebrow={isHousekeeping ? "Room readiness" : "Assets"} title={type} description={isHousekeeping ? "Assign, clean, inspect and release rooms using a persistent task board." : "Log, assign and resolve resort maintenance issues with an auditable status history."} />
    <form onSubmit={create} className="mb-6 grid gap-3 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-[1fr_1.5fr_140px_1fr_auto] md:items-end"><Field label="Room / area"><select name="unit" required className="h-10 rounded-md border bg-white px-3 text-sm"><option value="">Select configured unit</option>{units.map((unit) => <option key={unit.id}>{unit.name}</option>)}</select></Field><Field label="Task"><Input name="title" required placeholder={isHousekeeping ? "Checkout clean and replenish" : "Describe the issue"} /></Field><Field label="Priority"><select name="priority" className="h-10 rounded-md border bg-white px-3 text-sm"><option>Normal</option><option>High</option><option>Urgent</option></select></Field><Field label="Assign to"><Input name="assignee" placeholder="Staff or vendor" /></Field><Button className="bg-[#003b95]" disabled={busy}><Plus /> Add task</Button></form>
    <div className={`grid gap-5 ${statuses.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
      {statuses.map((status) => {
        const items = tasks.filter((task) => task.status === status);
        return <section key={status} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-4"><h2 className="font-bold">{status}</h2><Badge variant="secondary">{items.length}</Badge></div>
          <div className="divide-y">
            {items.map((task) => {
              const next = statuses[statuses.indexOf(task.status) + 1];
              return <div key={task.id} className="p-4"><div className="flex items-start justify-between gap-3"><span><strong className="block text-sm">{task.unit}</strong><span className="mt-1 block text-sm text-slate-600">{task.title}</span></span><Badge variant="outline" className={task.priority === "Urgent" ? "border-rose-200 bg-rose-50 text-rose-700" : task.priority === "High" ? "border-amber-200 bg-amber-50 text-amber-700" : ""}>{task.priority}</Badge></div><div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500"><span className="flex items-center gap-1"><Clock3 className="size-3.5" /> {task.assignee || "Unassigned"}</span>{next && <Button size="sm" variant="outline" onClick={() => void move(task, next)}>{next}</Button>}</div></div>;
            })}
            {items.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No tasks.</p>}
          </div>
        </section>;
      })}
    </div>
  </>;
}

function Header({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-[#006ce4]">{eyebrow}</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p></div>{action}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-semibold">{label}{children}</label>; }
function AccessError({ message }: { message: string }) { return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><ShieldAlert className="size-8 text-amber-700" /><h1 className="mt-4 text-xl font-bold text-amber-900">Access unavailable</h1><p className="mt-2 text-sm text-amber-800">{message}</p></div>; }
