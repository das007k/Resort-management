import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../admin/auth";

const defaultRates = [
  { id: "rate-pepper", roomKey: "pepper", roomName: "Pepper Cottage", baseRate: 9200, includedAdults: 2, extraAdultRate: 1500, childRate: 800, active: true },
  { id: "rate-cardamom", roomKey: "cardamom", roomName: "Cardamom Suite", baseRate: 8200, includedAdults: 2, extraAdultRate: 1500, childRate: 800, active: true },
  { id: "rate-cedar", roomKey: "cedar", roomName: "Cedar 2-BHK", baseRate: 12400, includedAdults: 4, extraAdultRate: 1500, childRate: 800, active: true },
  { id: "rate-mist", roomKey: "mist", roomName: "Mist Valley Room", baseRate: 6800, includedAdults: 2, extraAdultRate: 1500, childRate: 800, active: true },
];
const defaultSeasons = [
  { id: "season-green", name: "Green season", startDate: "2026-06-01", endDate: "2026-09-30", adjustmentPercent: -10, priority: 10, active: true },
  { id: "season-high", name: "High season", startDate: "2026-10-01", endDate: "2026-12-19", adjustmentPercent: 15, priority: 20, active: true },
  { id: "season-festive", name: "Festive peak", startDate: "2026-12-20", endDate: "2027-01-10", adjustmentPercent: 35, priority: 30, active: true },
];

export async function GET() {
  try {
    const db = getD1();
    const [rates, seasons] = await Promise.all([
      db.prepare("SELECT id, room_key AS roomKey, room_name AS roomName, base_rate AS baseRate, included_adults AS includedAdults, extra_adult_rate AS extraAdultRate, child_rate AS childRate, active FROM rate_plans ORDER BY room_name").all(),
      db.prepare("SELECT id, name, start_date AS startDate, end_date AS endDate, adjustment_percent AS adjustmentPercent, priority, active FROM season_rules ORDER BY priority DESC, start_date").all(),
    ]);
    return Response.json({ rates: rates.results.length ? rates.results : defaultRates, seasons: seasons.results.length ? seasons.results : defaultSeasons, defaultsInUse: !rates.results.length || !seasons.results.length });
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity;
    const input = await request.json() as Record<string, unknown>; const db = getD1();
    if (input.type === "rate") {
      if (!String(input.roomName ?? "").trim() || Number(input.baseRate) < 0) return Response.json({ error: "Room name and a valid base rate are required." }, { status: 400 });
      const id = String(input.id || crypto.randomUUID()); const roomKey = String(input.roomKey || id).toLowerCase().replace(/[^a-z0-9-]/g, "-");
      await db.prepare(`INSERT INTO rate_plans (id, room_key, room_name, base_rate, included_adults, extra_adult_rate, child_rate, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(room_key) DO UPDATE SET room_name=excluded.room_name, base_rate=excluded.base_rate, included_adults=excluded.included_adults, extra_adult_rate=excluded.extra_adult_rate, child_rate=excluded.child_rate, active=excluded.active, updated_at=CURRENT_TIMESTAMP`)
        .bind(id, roomKey, String(input.roomName).trim(), Math.round(Number(input.baseRate)), Math.max(1, Number(input.includedAdults || 1)), Math.max(0, Number(input.extraAdultRate || 0)), Math.max(0, Number(input.childRate || 0)), input.active === false ? 0 : 1).run();
    } else if (input.type === "season") {
      if (!String(input.name ?? "").trim() || !input.startDate || !input.endDate || String(input.startDate) > String(input.endDate)) return Response.json({ error: "Season name and a valid date range are required." }, { status: 400 });
      const id = String(input.id || crypto.randomUUID());
      await db.prepare(`INSERT INTO season_rules (id, name, start_date, end_date, adjustment_percent, priority, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name, start_date=excluded.start_date, end_date=excluded.end_date, adjustment_percent=excluded.adjustment_percent, priority=excluded.priority, active=excluded.active, updated_at=CURRENT_TIMESTAMP`)
        .bind(id, String(input.name).trim(), String(input.startDate), String(input.endDate), Math.max(-90, Math.min(500, Number(input.adjustmentPercent || 0))), Number(input.priority || 0), input.active === false ? 0 : 1).run();
    } else return Response.json({ error: "Unsupported pricing record." }, { status: 400 });
    return GET();
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
