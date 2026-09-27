import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/platform/observability/errors";
import { logger } from "@/platform/observability/logger";

/**
 * Standard error envelope every API route returns on failure:
 *   { error: { code, message, details? } }
 * Route handlers should wrap their body in a try/catch and call this in
 * the catch block, rather than hand-rolling NextResponse.json(...) with
 * ad-hoc shapes per route.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    if (error.httpStatus >= 500) {
      logger.error(error.message, { code: error.code, stack: error.stack });
    }
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.httpStatus },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  // Never leak internal error details/stack traces to the client.
  logger.error("Unhandled error in API route", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 },
  );
}
