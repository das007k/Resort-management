-- Mandatory principle §6 (linked-inventory / concurrency): this constraint is
-- the actual, database-enforced guarantee that no two reservation_units rows
-- for the SAME unit can ever have overlapping [check_in, check_out) ranges —
-- regardless of how many application processes attempt to book concurrently.
--
-- Combined with the availability service always inserting a blocking row for
-- every sibling unit affected by a booking (the whole-cottage unit when a
-- bedroom is booked, and every bedroom when the whole cottage is booked),
-- this single constraint is what makes overbooking impossible even under
-- concurrent requests or OTA retries — the second conflicting INSERT is
-- rejected by Postgres itself (error 23P01), not by application logic that
-- could race.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "reservation_units"
  ADD CONSTRAINT "reservation_units_no_overlap"
  EXCLUDE USING gist (
    "unit_id" WITH =,
    daterange("check_in", "check_out", '[)') WITH &&
  );
