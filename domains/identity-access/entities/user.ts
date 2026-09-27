export interface AuthenticatedUser {
  id: string;
  organisationId: string;
  email: string;
  fullName: string;
}

export interface SessionClaims {
  sub: string; // user id
  organisationId: string;
  email: string;
}

export interface PropertyRoleGrant {
  propertyId: string;
  roleId: string;
  roleName: string;
}
