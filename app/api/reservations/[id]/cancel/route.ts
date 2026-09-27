import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { availabilityService } from "@/platform/availability-service/service";
import { requireUser } from "@/platform/auth/guard";
import { rbacService } from "@/domains/identity-access/services/rbac-service";
import { PERMISSIONS } from "@/domains/identity-access/rules/permission-catalog";
import { db } from "@/platform/db/client";
import { reservationRepository } from "@/domains/reservations/repositories/reservation-repository";
import { NotFoundError } from "@/platform/observability/errors";
import { handleApiError } from "@/platform/observability/api-error-handler";

const cancelSchema = z.object({ reason: z.string().optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = cancelSchema.parse(await request.json().catch(() => ({})));

    const user = await requireUser(request);
    const reservation = await reservationRepository.findById(db, id);
    if (!reservation) throw new NotFoundError("Reservation", id);
    await rbacService.assertPermission(user.id, reservation.propertyId, PERMISSIONS.BOOKING_CANCEL);

    const updated = await availabilityService.cancelBooking(id, user.id, body.reason);
    return NextResponse.json({ reservation: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
