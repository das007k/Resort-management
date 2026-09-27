export interface CreateOrganisationInput {
  name: string;
  slug: string;
}

export interface CreatePropertyInput {
  organisationId: string;
  name: string;
  slug: string;
  timezone?: string;
  currency?: string;
  actorUserId?: string;
}
