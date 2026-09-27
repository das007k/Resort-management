import { db } from "@/platform/db/client";
import { organisationRepository } from "@/domains/property/repositories/organisation-repository";
import { propertyRepository } from "@/domains/property/repositories/property-repository";
import { auditService } from "@/domains/audit/services/audit-service";
import { ValidationError } from "@/platform/observability/errors";
import type { CreateOrganisationInput, CreatePropertyInput } from "@/domains/property/entities/property";

export const propertyService = {
  async createOrganisation(input: CreateOrganisationInput) {
    const existing = await organisationRepository.findBySlug(db, input.slug);
    if (existing) throw new ValidationError(`Organisation slug "${input.slug}" is already in use`);
    return organisationRepository.create(db, input);
  },

  async createProperty(input: CreatePropertyInput) {
    return db.transaction(async (tx) => {
      const existing = await propertyRepository.findBySlug(tx, input.organisationId, input.slug);
      if (existing) throw new ValidationError(`Property slug "${input.slug}" is already in use in this organisation`);

      const property = await propertyRepository.create(tx, input);

      await auditService.record(tx, {
        organisationId: input.organisationId,
        propertyId: property.id,
        actorUserId: input.actorUserId,
        action: "property.created",
        entityType: "property",
        entityId: property.id,
        after: property,
      });

      return property;
    });
  },

  async listPropertiesForOrganisation(organisationId: string) {
    return propertyRepository.listForOrganisation(db, organisationId);
  },
};
