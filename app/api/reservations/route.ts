import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { availabilityService } from "@/platform/availability-service/service";
import { requirePermission } from "@/platform/auth/guard";
import { PERMISSIONS } from "@/domains/identity-access/rules/permission-catalog";
import { handleApiError } from "@/platform/observability/api-error-handler";

const createReservationSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkIn must be YYYY-MM-DD"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkOut must be YYYY-MM-DD"),
  source: z.enum(["MANUAL", "DIRECT", "OTA", "WALK_IN"]).default("MANUAL"),
  status: z.enum(["TENTATIVE", "CONFIRMED"]).optional(),
  externalReference: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = createReservationSchema.parse(await request.json());
    const user = await requirePermission(request, body.propertyId, PERMISSIONS.RESERVATION_CREATE);

    const result = await availabilityService.createBooking({ ...body, actorUserId: user.id });
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
