import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { db } from "@/platform/db/client";
import { auditService } from "@/domains/audit/services/audit-service";
import { createOrgAndProperty } from "@/tests/helpers/fixtures";

describe("audit service", () => {
  it("records before/after state and retrieves it by entity", async () => {
    const { org, property } = await createOrgAndProperty();
    const entityId = randomUUID(); // unique per run — the test DB isn't truncated between runs

    await auditService.record(db, {
      organisationId: org.id,
      propertyId: property.id,
      action: "rate.override",
      entityType: "unit",
      entityId,
      before: { amountMinor: 500000 },
      after: { amountMinor: 450000 },
    });

    const history = await auditService.historyFor(db, "unit", entityId);
    expect(history).toHaveLength(1);
    expect(history[0]?.action).toBe("rate.override");
    expect((history[0]?.after as { amountMinor: number }).amountMinor).toBe(450000);
  });
});
