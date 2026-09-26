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
      await db.prepare(`UPDATE property_settings SET gst_enabled = ?, accommodation_tax_rate = ?, service_tax_rate = ?,
        prices_include_tax = ?, gstin = ?, invoice_prefix = ?, updated_at = CURRENT_TIMESTAMP, updated_by_email = ? WHERE id = 'primary'`)
        .bind(input.gstEnabled ? 1 : 0, Math.max(0, Math.min(100, Number(input.accommodationRate ?? 0))), Math.max(0, Math.min(100, Number(input.serviceRate ?? 0))), input.pricesIncludeTax ? 1 : 0, String(input.gstin ?? ""), String(input.invoicePrefix ?? "CRR"), identity.email).run();
    } else if (input.type === "service" && input.id) {
      await db.prepare("UPDATE resort_services SET active = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(input.active ? 1 : 0, Math.max(0, Math.round(Number(input.price ?? 0))), String(input.id)).run();
    } else return Response.json({ error: "Unsupported configuration update." }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
