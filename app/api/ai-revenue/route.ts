import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../admin/auth";

const readRoles = ["Admin", "Manager", "Accounts", "Front Desk"];
const iso = (date: Date) => date.toISOString().slice(0, 10);

async function seedSampleMarket() {
  const db = getD1(); const count = await db.prepare("SELECT COUNT(*) AS count FROM market_rate_snapshots").first<{ count: number }>(); if (count?.count) return;
  const target = new Date(); target.setUTCDate(target.getUTCDate() + 7); const stayDate = iso(target);
  const samples = [["Nearby Resort A", 8800], ["Nearby Resort B", 9600], ["Nearby Resort C", 10200], ["Nearby Resort D", 9100]] as const;
  await db.batch(samples.map(([name, rate]) => db.prepare(`INSERT INTO market_rate_snapshots (id, property_name, stay_date, room_type, rate, source) VALUES (?, ?, ?, 'Comparable premium room', ?, 'Sample data')`).bind(crypto.randomUUID(), name, stayDate, rate)));
}

async function generateRecommendation() {
  await seedSampleMarket(); const db = getD1();
  const rates = await db.prepare("SELECT rate, stay_date AS stayDate FROM market_rate_snapshots ORDER BY captured_at DESC LIMIT 20").all<{ rate: number; stayDate: string }>();
  const values = rates.results.map((item) => Number(item.rate)).sort((a, b) => a - b); const median = values[Math.floor(values.length / 2)] ?? 9200;
  const plan = await db.prepare("SELECT room_key AS roomKey, room_name AS roomName, base_rate AS baseRate FROM rate_plans WHERE active = 1 ORDER BY base_rate DESC LIMIT 1").first<{ roomKey: string; roomName: string; baseRate: number }>();
  const currentRate = Number(plan?.baseRate ?? 9200); const proposedRate = Math.max(currentRate, Math.round((median * 1.03) / 100) * 100); const targetDate = rates.results[0]?.stayDate ?? iso(new Date());
  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO ai_recommendations (id, recommendation_type, title, summary, rationale_json, target_date, room_key, current_rate, proposed_rate, promotion_json, audience_json, channels_json, confidence)
    VALUES (?, 'Rate + campaign', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, `${plan?.roomName ?? "Premium room"}: weekend revenue opportunity`, `Raise the public rate to ₹${proposedRate.toLocaleString("en-IN")} and offer a direct-booking value package instead of a broad discount.`, JSON.stringify([`Sample competitor median is ₹${median.toLocaleString("en-IN")}`, "Recommendation respects the configured base-rate floor", "Direct-value packaging protects rate parity", "Approval is required before rate or campaign execution"]), targetDate, plan?.roomKey ?? "pepper", currentRate, proposedRate, JSON.stringify({ name: "Weekend Nature Escape", discountPercent: 0, benefits: ["Breakfast", "Guided plantation walk"], validity: targetDate }), JSON.stringify({ segment: "Past direct guests", filters: ["Stayed in last 24 months", "Marketing consent available", "No active booking for target dates"] }), JSON.stringify(["WhatsApp", "SMS", "Email"]), 82).run();
}

async function payload() {
  const db = getD1(); const [market, recommendations, campaignRows] = await Promise.all([
    db.prepare("SELECT id, property_name AS propertyName, stay_date AS stayDate, room_type AS roomType, rate, source, captured_at AS capturedAt FROM market_rate_snapshots ORDER BY rate").all(),
    db.prepare("SELECT id, recommendation_type AS recommendationType, title, summary, rationale_json AS rationaleJson, target_date AS targetDate, room_key AS roomKey, current_rate AS currentRate, proposed_rate AS proposedRate, promotion_json AS promotionJson, audience_json AS audienceJson, channels_json AS channelsJson, confidence, status, approved_by_email AS approvedByEmail, approved_at AS approvedAt, created_at AS createdAt FROM ai_recommendations ORDER BY created_at DESC LIMIT 20").all(),
    db.prepare("SELECT id, recommendation_id AS recommendationId, name, audience_json AS audienceJson, channels_json AS channelsJson, content_json AS contentJson, status, scheduled_at AS scheduledAt, created_at AS createdAt FROM campaigns ORDER BY created_at DESC LIMIT 20").all(),
  ]);
  const parse = (row: Record<string, unknown>) => ({ ...row, rationale: JSON.parse(String(row.rationaleJson || "[]")), promotion: JSON.parse(String(row.promotionJson || "{}")), audience: JSON.parse(String(row.audienceJson || "{}")), channels: JSON.parse(String(row.channelsJson || "[]")), content: JSON.parse(String(row.contentJson || "{}")), rationaleJson: undefined, promotionJson: undefined, audienceJson: undefined, channelsJson: undefined, contentJson: undefined });
  return { marketRates: market.results, recommendations: recommendations.results.map((row) => parse(row as Record<string, unknown>)), campaigns: campaignRows.results.map((row) => parse(row as Record<string, unknown>)) };
}

export async function GET(request: Request) {
  try { const identity = await requireStaff(request, readRoles); if (identity instanceof Response) return identity; await seedSampleMarket(); const existing = await getD1().prepare("SELECT id FROM ai_recommendations LIMIT 1").first(); if (!existing) await generateRecommendation(); return Response.json(await payload()); }
  catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try { const identity = await requireStaff(request, ["Admin", "Manager"]); if (identity instanceof Response) return identity; await generateRecommendation(); return Response.json(await payload(), { status: 201 }); }
  catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity;
    const { id, action } = await request.json() as { id?: string; action?: "approve" | "reject" }; if (!id || !["approve", "reject"].includes(String(action))) return Response.json({ error: "Valid recommendation action is required." }, { status: 400 });
    const db = getD1(); const recommendation = await db.prepare("SELECT id, title, summary, promotion_json AS promotionJson, audience_json AS audienceJson, channels_json AS channelsJson, status FROM ai_recommendations WHERE id = ?").bind(id).first<Record<string, unknown>>();
    if (!recommendation) return Response.json({ error: "Recommendation not found." }, { status: 404 });
    if (recommendation.status !== "Proposed") return Response.json({ error: "This recommendation has already been reviewed." }, { status: 409 });
    if (action === "reject") await db.prepare("UPDATE ai_recommendations SET status = 'Rejected', approved_by_email = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?").bind(identity.email, id).run();
    else {
      const active = await db.prepare("SELECT COUNT(*) AS count FROM connector_configurations WHERE enabled = 1 AND status = 'Connected'").first<{ count: number }>(); const campaignStatus = active?.count ? "Scheduled" : "Approved — awaiting connectors";
      const promotion = JSON.parse(String(recommendation.promotionJson || "{}"));
      await db.batch([
        db.prepare("UPDATE ai_recommendations SET status = 'Approved', approved_by_email = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?").bind(identity.email, id),
        db.prepare(`INSERT INTO campaigns (id, recommendation_id, name, audience_json, channels_json, content_json, status, approved_by_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), id, String(promotion.name || recommendation.title), String(recommendation.audienceJson), String(recommendation.channelsJson), JSON.stringify({ message: recommendation.summary, approvalRequired: false, source: "AI recommendation" }), campaignStatus, identity.email),
      ]);
    }
    return Response.json(await payload());
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
