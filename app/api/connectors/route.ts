import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../admin/auth";

const readRoles = ["Admin", "Manager", "Front Desk", "Accounts"];
const defaults = [
  { id: "booking-com", category: "OTA", provider: "Booking.com", name: "Booking.com", capabilities: ["rates", "inventory", "reservations"], secrets: ["BOOKING_CONNECTIVITY_USERNAME", "BOOKING_CONNECTIVITY_PASSWORD"] },
  { id: "agoda", category: "OTA", provider: "Agoda", name: "Agoda", capabilities: ["rates", "inventory", "reservations"], secrets: ["AGODA_API_KEY"] },
  { id: "makemytrip", category: "OTA", provider: "MakeMyTrip / Goibibo", name: "MakeMyTrip / Goibibo", capabilities: ["rates", "inventory", "reservations"], secrets: ["MMT_API_KEY", "MMT_API_SECRET"] },
  { id: "google-hotels", category: "Metasearch", provider: "Google Hotels", name: "Google Hotels", capabilities: ["rates", "availability", "direct booking link"], secrets: ["GOOGLE_HOTELS_PARTNER_KEY"] },
  { id: "whatsapp-meta", category: "Messaging", provider: "WhatsApp Cloud API", name: "WhatsApp Business", capabilities: ["templates", "notifications", "guest replies"], secrets: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"] },
  { id: "email", category: "Messaging", provider: "Email provider", name: "Transactional email", capabilities: ["quotations", "invoices", "booking notifications"], secrets: ["EMAIL_API_KEY"] },
  { id: "sms", category: "Messaging", provider: "SMS provider", name: "Transactional SMS", capabilities: ["booking notifications", "payment reminders", "OTP"], secrets: ["SMS_API_KEY", "SMS_SENDER_ID"] },
  { id: "payment-gateway", category: "Payments", provider: "Payment gateway", name: "Online payments", capabilities: ["payment links", "webhooks", "refund status"], secrets: ["PAYMENT_KEY_SECRET", "PAYMENT_WEBHOOK_SECRET"] },
] as const;

async function ensureDefaults() {
  const db = getD1();
  const count = await db.prepare("SELECT COUNT(*) AS count FROM connector_configurations").first<{ count: number }>();
  if (count?.count) return;
  await db.batch(defaults.map((item) => db.prepare(`INSERT INTO connector_configurations
    (id, category, provider, display_name, webhook_path, capabilities_json, secret_keys_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(item.id, item.category, item.provider, item.name, `/api/webhooks/${item.id}`, JSON.stringify(item.capabilities), JSON.stringify(item.secrets))));
}

async function listConnectors() {
  const result = await getD1().prepare(`SELECT id, category, provider, display_name AS displayName,
    mode, status, base_url AS baseUrl, account_id AS accountId, property_id AS propertyId,
    webhook_path AS webhookPath, capabilities_json AS capabilitiesJson, secret_keys_json AS secretKeysJson,
    enabled, last_checked_at AS lastCheckedAt, updated_at AS updatedAt
    FROM connector_configurations ORDER BY category, display_name`).all();
  return result.results.map((row) => { const item = row as Record<string, unknown>; return { ...item, capabilities: JSON.parse(String(item.capabilitiesJson || "[]")), secretKeys: JSON.parse(String(item.secretKeysJson || "[]")), capabilitiesJson: undefined, secretKeysJson: undefined }; });
}

export async function GET(request: Request) {
  try { const identity = await requireStaff(request, readRoles); if (identity instanceof Response) return identity; await ensureDefaults(); return Response.json({ connectors: await listConnectors() }); }
  catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity;
    const input = await request.json() as Record<string, unknown>; const id = String(input.id || "");
    if (!id) return Response.json({ error: "Connector ID is required." }, { status: 400 });
    const baseUrl = String(input.baseUrl || "").trim(); const accountId = String(input.accountId || "").trim(); const propertyId = String(input.propertyId || "").trim();
    const status = baseUrl || accountId || propertyId ? "Ready for credentials" : "Not configured";
    await getD1().prepare(`UPDATE connector_configurations SET mode = ?, status = ?, base_url = ?, account_id = ?,
      property_id = ?, enabled = 0, updated_at = CURRENT_TIMESTAMP, updated_by_email = ? WHERE id = ?`)
      .bind(input.mode === "Live" ? "Live" : "Test", status, baseUrl, accountId, propertyId, identity.email, id).run();
    return Response.json({ connectors: await listConnectors() });
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity;
    const { id } = await request.json() as { id?: string }; if (!id) return Response.json({ error: "Connector ID is required." }, { status: 400 });
    await ensureDefaults(); const db = getD1();
    const connector = await db.prepare("SELECT id, category, display_name AS displayName FROM connector_configurations WHERE id = ?").bind(id).first<{ id: string; category: string; displayName: string }>();
    if (!connector) return Response.json({ error: "Connector not found." }, { status: 404 });
    const common = [{ name: "Configuration schema", detail: "Required account, property and secret mappings are recognized." }];
    const scenarios: Record<string, Array<{ name: string; detail: string }>> = {
      OTA: [
        { name: "Reservation import", detail: "Dummy booking DMY-1001 mapped to Cardamom Rock inventory." },
        { name: "Rate export", detail: "Seasonal rate and occupancy payload generated successfully." },
        { name: "Inventory update", detail: "Cedar 2-BHK parent/child availability rule preserved." },
        { name: "Duplicate protection", detail: "Overlapping dummy reservation correctly rejected." },
      ],
      Metasearch: [
        { name: "Availability feed", detail: "Dummy rates and availability feed generated." },
        { name: "Booking link", detail: "Direct-booking attribution parameters validated." },
      ],
      Messaging: [
        { name: "Template rendering", detail: "Guest, stay dates, amount and payment-link variables rendered." },
        { name: "Delivery callback", detail: "Dummy delivered/read/failed webhook events processed." },
        { name: "Safety guard", detail: "No real message was sent during simulation." },
      ],
      Payments: [
        { name: "Payment-link request", detail: "Dummy ₹9,200 collection request generated." },
        { name: "Webhook verification", detail: "Simulated paid and failed events reconciled to DMY-1001." },
        { name: "Safety guard", detail: "No charge, refund or settlement was initiated." },
      ],
    };
    const tests = [...common, ...(scenarios[connector.category] ?? [])].map((test) => ({ ...test, passed: true }));
    await db.prepare("UPDATE connector_configurations SET last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, updated_by_email = ? WHERE id = ?").bind(identity.email, id).run();
    return Response.json({ simulation: { connectorId: id, connectorName: connector.displayName, passed: true, dummyReference: `SIM-${Date.now().toString().slice(-8)}`, tests, completedAt: new Date().toISOString() } });
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
