import type { NextRequest } from "next/server";
import { authService } from "@/domains/identity-access/services/auth-service";
import { rbacService } from "@/domains/identity-access/services/rbac-service";
import { UnauthenticatedError } from "@/platform/observability/errors";
import { getSessionTokenFromRequest } from "@/platform/auth/session-cookie";
import type { AuthenticatedUser } from "@/domains/identity-access/entities/user";
import type { PermissionKey } from "@/domains/identity-access/rules/permission-catalog";

/** Resolves the authenticated user for a request, or throws UnauthenticatedError. */
export async function requireUser(request: NextRequest): Promise<AuthenticatedUser> {
  const token = getSessionTokenFromRequest(request);
  const user = await authService.currentUserFromToken(token);
  if (!user) throw new UnauthenticatedError();
  return user;
}

/**
 * Resolves the authenticated user AND asserts they hold `permission` on
 * `propertyId`. Use this at the top of every API route handler that
 * performs a property-scoped, permission-gated action.
 */
export async function requirePermission(
  request: NextRequest,
  propertyId: string,
  permission: PermissionKey,
): Promise<AuthenticatedUser> {
  const user = await requireUser(request);
  await rbacService.assertPermission(user.id, propertyId, permission);
  return user;
}
