-- Corrective migration (Phase 1 review fix): enforce organisation/property
-- consistency across RBAC and inventory relationships at the DATABASE
-- layer, not just in service-layer code.
--
-- Adds three denormalized columns (linked_inventory_members.property_id,
-- reservation_units.property_id, user_property_access.organisation_id) plus
-- composite foreign keys that force each of those rows' referenced entities
-- to actually share the claimed organisation/property, mirroring the rigor
-- already applied to linked-inventory overlap prevention (mandatory
-- principle §6: enforced in the database transaction layer, not just the
-- UI). Concretely, once this migration is applied, Postgres itself rejects:
--   * a user_property_access grant whose user, property, and role don't all
--     belong to the same organisation;
--   * a linked_inventory_members row whose group and unit don't belong to
--     the same property;
--   * a reservation_units row whose reservation and unit don't belong to
--     the same property;
--   * a units row whose building or unit_type don't belong to the same
--     property as the unit itself.
--
-- The new columns are backfilled from each row's existing (single-column)
-- relationships BEFORE being made NOT NULL, so this is safe to run against
-- a database that already has data (e.g. this sandbox's seeded dev/test
-- databases), not only an empty one.

-- --- 1. Add the new columns, nullable for now -------------------------------
ALTER TABLE "linked_inventory_members" ADD COLUMN "property_id" text;--> statement-breakpoint
ALTER TABLE "reservation_units" ADD COLUMN "property_id" text;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD COLUMN "organisation_id" text;--> statement-breakpoint

-- --- 2. Backfill from existing relationships --------------------------------
UPDATE "linked_inventory_members" lim
SET "property_id" = lig."property_id"
FROM "linked_inventory_groups" lig
WHERE lig."id" = lim."group_id";--> statement-breakpoint

UPDATE "reservation_units" ru
SET "property_id" = r."property_id"
FROM "reservations" r
WHERE r."id" = ru."reservation_id";--> statement-breakpoint

-- Backfilled from the property's organisation, since property-scoped RBAC
-- already treats a property's organisation as the source of truth for
-- "which organisation does this grant belong to".
UPDATE "user_property_access" upa
SET "organisation_id" = p."organisation_id"
FROM "properties" p
WHERE p."id" = upa."property_id";--> statement-breakpoint

-- --- 3. Now that every row has a value, enforce NOT NULL --------------------
ALTER TABLE "linked_inventory_members" ALTER COLUMN "property_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reservation_units" ALTER COLUMN "property_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_property_access" ALTER COLUMN "organisation_id" SET NOT NULL;--> statement-breakpoint

-- --- 4. Single-column FKs for the new columns -------------------------------
ALTER TABLE "linked_inventory_members" ADD CONSTRAINT "linked_inventory_members_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_units" ADD CONSTRAINT "reservation_units_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD CONSTRAINT "user_property_access_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- --- 5. Composite unique indexes (FK targets) on the parent tables ---------
CREATE UNIQUE INDEX "buildings_property_id_uq" ON "buildings" USING btree ("property_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "ling_property_id_uq" ON "linked_inventory_groups" USING btree ("property_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_org_id_uq" ON "properties" USING btree ("organisation_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_property_id_uq" ON "reservations" USING btree ("property_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_org_id_uq" ON "roles" USING btree ("organisation_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_types_property_id_uq" ON "unit_types" USING btree ("property_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "units_property_id_uq" ON "units" USING btree ("property_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_org_id_uq" ON "users" USING btree ("organisation_id","id");--> statement-breakpoint

-- --- 6. The composite FKs that do the actual consistency enforcement ------
ALTER TABLE "linked_inventory_members" ADD CONSTRAINT "linm_property_group_fk" FOREIGN KEY ("property_id","group_id") REFERENCES "public"."linked_inventory_groups"("property_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_inventory_members" ADD CONSTRAINT "linm_property_unit_fk" FOREIGN KEY ("property_id","unit_id") REFERENCES "public"."units"("property_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_units" ADD CONSTRAINT "res_units_property_reservation_fk" FOREIGN KEY ("property_id","reservation_id") REFERENCES "public"."reservations"("property_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_units" ADD CONSTRAINT "res_units_property_unit_fk" FOREIGN KEY ("property_id","unit_id") REFERENCES "public"."units"("property_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_property_building_fk" FOREIGN KEY ("property_id","building_id") REFERENCES "public"."buildings"("property_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_property_unit_type_fk" FOREIGN KEY ("property_id","unit_type_id") REFERENCES "public"."unit_types"("property_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD CONSTRAINT "upa_org_user_fk" FOREIGN KEY ("organisation_id","user_id") REFERENCES "public"."users"("organisation_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD CONSTRAINT "upa_org_property_fk" FOREIGN KEY ("organisation_id","property_id") REFERENCES "public"."properties"("organisation_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_property_access" ADD CONSTRAINT "upa_org_role_fk" FOREIGN KEY ("organisation_id","role_id") REFERENCES "public"."roles"("organisation_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- --- 7. Remaining plain indexes ---------------------------------------------
CREATE INDEX "linm_property_idx" ON "linked_inventory_members" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "res_units_property_idx" ON "reservation_units" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "upa_org_idx" ON "user_property_access" USING btree ("organisation_id");
