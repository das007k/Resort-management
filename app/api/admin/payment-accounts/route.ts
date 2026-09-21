import { databaseError, getD1 } from "@/db/d1";
import { requireStaff } from "../auth";

export async function GET(request: Request) {
  try { const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity; const result = await getD1().prepare("SELECT id, provider, display_name AS displayName, merchant_id AS merchantId, key_id AS keyId, upi_id AS upiId, settlement_account_mask AS settlementAccountMask, mode, active, updated_at AS updatedAt FROM payment_accounts ORDER BY provider").all(); return Response.json({ accounts: result.results }); }
  catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const identity = await requireStaff(request, ["Admin"]); if (identity instanceof Response) return identity;
    const input = await request.json() as Record<string, unknown>; const provider = String(input.provider || "").trim(); if (!provider) return Response.json({ error: "Payment provider is required." }, { status: 400 });
    const id = String(input.id || crypto.randomUUID());
    await getD1().prepare(`INSERT INTO payment_accounts (id, provider, display_name, merchant_id, key_id, upi_id, settlement_account_mask, mode, active, updated_at, updated_by_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?) ON CONFLICT(provider) DO UPDATE SET display_name=excluded.display_name, merchant_id=excluded.merchant_id, key_id=excluded.key_id, upi_id=excluded.upi_id, settlement_account_mask=excluded.settlement_account_mask, mode=excluded.mode, active=excluded.active, updated_at=CURRENT_TIMESTAMP, updated_by_email=excluded.updated_by_email`)
      .bind(id, provider, String(input.displayName || provider), String(input.merchantId || ""), String(input.keyId || ""), String(input.upiId || ""), String(input.settlementAccountMask || ""), input.mode === "Live" ? "Live" : "Test", input.active ? 1 : 0, identity.email).run();
    return GET(request);
  } catch (error) { return Response.json({ error: databaseError(error) }, { status: 500 }); }
}
