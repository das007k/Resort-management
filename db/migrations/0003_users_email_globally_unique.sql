-- Corrective migration (Phase 1 review fix): login must be tenant-unambiguous.
--
-- The original schema made `email` unique only WITHIN an organisation
-- (users_org_email_uq on (organisation_id, email)). The login endpoint takes
-- only an email + password, with no organisation selector, so two different
-- organisations could each register a user with the same email and login
-- would then be ambiguous about which account to authenticate. This
-- migration replaces the per-org unique index with a platform-wide one on
-- email alone, plus a plain index on organisation_id for the per-org lookups
-- that no longer come "for free" from the old composite unique index.
--
-- NOTE: this will fail if any existing data already has duplicate emails
-- across organisations. There is no production data yet (Phase 1,
-- pre-launch), so no backfill/dedup step is included here. If this is ever
-- run against a database with real cross-org duplicate emails, resolve those
-- duplicates before applying.

DROP INDEX "users_org_email_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("organisation_id");
