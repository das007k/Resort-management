import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/platform/auth/guard";
import { handleApiError } from "@/platform/observability/api-error-handler";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
