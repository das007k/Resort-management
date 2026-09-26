import { databaseError, getD1 } from "@/db/d1";
import { serviceCatalogue } from "@/app/commercial-config";
import { seedUnits } from "@/app/domain";
import { requireStaff } from "../admin/auth";

const readRoles = ["Admin", "Manager", "Front Desk", "Accounts", "Housekeeping", "Maintenance"];

async function ensureDefaults() {
  const db = getD1();
  const settings = await db.prepare("SELECT id FROM property_settings WHERE id = 'primary'").first();
  if (!settings) await db.prepare("INSERT INTO property_settings (id, gstin) VALUES ('primary', '32ABCDE1234F1Z5')").run();
  const unitCount = await db.prepare("SELECT COUNT(*) AS count FROM accommodation_units").first<{ count: number }>();
  if (!unitCount?.count) await db.batch(seedUnits.map((unit) => db.prepare(`
    INSERT INTO accommodation_units (id, name, type, parent_id, base_rate, housekeeping_status, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).bind(unit.id, unit.name, unit.type, unit.parent ?? null, unit.rate, unit.status === "Dirty" ? "Dirty" : "Ready")));
  const serviceCount = await db.prepare("SELECT COUNT(*) AS count FROM resort_services").first<{ count: number }>();
  if (!serviceCount?.count) await db.batch(serviceCatalogue.map((service) => db.prepare(`
    INSERT INTO resort_services (id, category, name, unit, price, active, bookable_online, approval_required)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(service.id, service.category, service.name, service.unit, service.price, service.defaultEnabled ? 1 : 0, service.defaultEnabled ? 1 : 0, 0)));
}

export async function GET(request: Request) {
  try {
    const identity = await requireStaff(request, readRoles); if (identity instanceof Response) return identity;
    await ensureDefaults(); const db = getD1();
    const [settings, units, services] = await Promise.all([
      db.prepare(`SELECT property_name AS propertyName, currency, timezone, gst_enabled AS gstEnabled,
        accommodation_tax_rate AS accommodationRate, service_tax_rate AS serviceRate,
        prices_include_tax AS pricesIncludeTax, gstin, invoice_prefix AS invoicePrefix
        FROM property_settings WHERE id = 'primary'`).first(),
      db.prepare(`SELECT id, name, type, parent_id AS parent, capacity_adults AS capacityAdults,
        capacity_children AS capacityChildren, base_rate AS rate, housekeeping_status AS housekeepingStatus,
        active FROM accommodation_units ORDER BY name`).all(),
      db.prepare(`SELECT id, category, name, unit, price, active, bookable_online AS bookableOnline,
        approval_required AS approvalRequired FROM resort_services ORDER BY category, name`).all(),
    ]);
    return Response.json({ settings, units: units.results, services: services.results });
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity;
    const input = await request.json() as Record<string, unknown>; const db = getD1();
    if (input.type === "settings") {
      await db.prepare(`UPDATE property_settings SET property_name = ?, currency = ?, timezone = ?, gst_enabled = ?, accommodation_tax_rate = ?, service_tax_rate = ?,
        prices_include_tax = ?, gstin = ?, invoice_prefix = ?, updated_at = CURRENT_TIMESTAMP, updated_by_email = ? WHERE id = 'primary'`)
        .bind(String(input.propertyName || "Cardamom Rock Resort"), String(input.currency || "INR"), String(input.timezone || "Asia/Kolkata"), input.gstEnabled ? 1 : 0, Math.max(0, Math.min(100, Number(input.accommodationRate ?? 0))), Math.max(0, Math.min(100, Number(input.serviceRate ?? 0))), input.pricesIncludeTax ? 1 : 0, String(input.gstin ?? ""), String(input.invoicePrefix ?? "CRR"), identity.email).run();
    } else if (input.type === "service" && input.id) {
      await db.prepare("UPDATE resort_services SET active = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(input.active ? 1 : 0, Math.max(0, Math.round(Number(input.price ?? 0))), String(input.id)).run();
    } else if (input.type === "unit" && input.id) {
      if (!String(input.name || "").trim()) return Response.json({ error: "Room name is required." }, { status: 400 });
      await db.prepare(`UPDATE accommodation_units SET name = ?, type = ?, parent_id = ?, capacity_adults = ?, capacity_children = ?, base_rate = ?, housekeeping_status = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(String(input.name).trim(), input.unitType === "Cottage" ? "Cottage" : "Room", input.parent || null, Math.max(1, Number(input.capacityAdults || 1)), Math.max(0, Number(input.capacityChildren || 0)), Math.max(0, Math.round(Number(input.rate || 0))), String(input.housekeepingStatus || "Ready"), input.active ? 1 : 0, String(input.id)).run();
      await db.prepare(`INSERT INTO rate_plans (id, room_key, room_name, base_rate, active) VALUES (?, ?, ?, ?, ?) ON CONFLICT(room_key) DO UPDATE SET room_name=excluded.room_name, base_rate=excluded.base_rate, active=excluded.active, updated_at=CURRENT_TIMESTAMP`)
        .bind(`rate-${input.id}`, String(input.id), String(input.name).trim(), Math.max(0, Math.round(Number(input.rate || 0))), input.active ? 1 : 0).run();
    } else return Response.json({ error: "Unsupported configuration update." }, { status: 400 });
    return GET(request);
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity;
    const input = await request.json() as Record<string, unknown>; const db = getD1();
    if (input.type === "unit") {
      const name = String(input.name || "").trim(); if (!name) return Response.json({ error: "Room name is required." }, { status: 400 }); const id = crypto.randomUUID(); const rate = Math.max(0, Math.round(Number(input.rate || 0)));
      await db.batch([
        db.prepare(`INSERT INTO accommodation_units (id, name, type, parent_id, capacity_adults, capacity_children, base_rate, housekeeping_status, active) VALUES (?, ?, ?, ?, ?, ?, ?, 'Ready', 1)`).bind(id, name, input.unitType === "Cottage" ? "Cottage" : "Room", input.parent || null, Math.max(1, Number(input.capacityAdults || 2)), Math.max(0, Number(input.capacityChildren || 1)), rate),
        db.prepare(`INSERT INTO rate_plans (id, room_key, room_name, base_rate, active) VALUES (?, ?, ?, ?, 1)`).bind(`rate-${id}`, id, name, rate),
      ]);
    } else if (input.type === "service") {
      const name = String(input.name || "").trim(); if (!name) return Response.json({ error: "Service name is required." }, { status: 400 });
      await db.prepare(`INSERT INTO resort_services (id, category, name, unit, price, active, bookable_online, approval_required) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`)
        .bind(crypto.randomUUID(), String(input.category || "Convenience"), name, String(input.unit || "per booking"), Math.max(0, Math.round(Number(input.price || 0))), input.bookableOnline ? 1 : 0, input.approvalRequired ? 1 : 0).run();
    } else return Response.json({ error: "Unsupported configuration record." }, { status: 400 });
    return GET(request);
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
