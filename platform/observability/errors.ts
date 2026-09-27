/**
 * Standardized application error hierarchy. Every domain throws one of
 * these (never a bare Error) so API route handlers can map it to a
 * consistent HTTP error envelope without leaking internals — see
 * platform/observability/api-error-handler.ts.
 */

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "AVAILABILITY_CONFLICT"
  | "IDEMPOTENCY_REPLAY"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  AVAILABILITY_CONFLICT: 409,
  IDEMPOTENCY_REPLAY: 200,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} ${id} was not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHENTICATED", message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(permissionKey: string) {
    super("FORBIDDEN", `Missing required permission: ${permissionKey}`);
    this.name = "ForbiddenError";
  }
}

/**
 * Thrown by the availability service when a booking cannot be made because
 * the unit — or a sibling unit in its linked-inventory group — is already
 * occupied for an overlapping date range, or is out of order.
 */
export class AvailabilityConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super("AVAILABILITY_CONFLICT", message, details);
    this.name = "AvailabilityConflictError";
  }
}
