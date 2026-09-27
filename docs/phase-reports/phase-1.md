# StayAxis — Phase 1: Production Foundation — Delivery Report

**Status:** Corrected per ChatGPT's architecture/QA review. Architecture was accepted; implementation approval was withheld pending 6 specific fixes — all 6 are implemented below, plus the regression tests the review asked for. Awaiting re-review before Phase 2 begins.
**Branch:** `claude-development` (committed locally; not yet pushed — see "Known limitations," item 1).
**Date:** 2026-09-17 (original delivery), corrected 2026-09-17.

## 0. Context: this is a greenfield build

The `das007k/Resort-management` repository was created empty — there was no existing StayAxis codebase to inspect, preserve, or migrate. The live reference app at `stayaxis-resort.das007k.chatgpt.site` also could not be inspected (it returns HTTP 401). Phase 1 therefore builds the production foundation from scratch, directly from the architecture, folder structure, and data model proposed and reviewed in the Phase 0 response, rather than assessing and refactoring existing code.

## 1. What this correction pass changes

ChatGPT's review of the original Phase 1 delivery accepted the architecture (Drizzle ORM, repo-root Next.js, Postgres `EXCLUDE` constraint, parent/child blocking strategy, transactional audit events, property-scoped RBAC) but withheld implementation approval pending six specific fixes, plus regression tests and this report correction. All six are implemented, verified against a real local PostgreSQL instance, and described below. **No Phase 2 work was started** — this pass is scoped entirely to the six corrective fixes, their tests, and this report.

1. **`allowSeparateSale: false` was stored but never read** (§5.1) — bedrooms stayed independently bookable even when a property's linked-inventory config said they shouldn't be. Fixed.
2. **Idempotency replay had a race window** (§5.2) — the duplicate-submission check ran before the transaction, so two concurrent requests carrying the same idempotency key could both pass it and then race on the insert; the loser used to surface a raw error instead of a clean replay. Fixed.
3. **Login was tenant-ambiguous** (§5.3) — email was unique only within an organisation, and login takes no organisation selector, so two organisations could each register a user with the same email and login couldn't unambiguously resolve one. Fixed by making email globally unique.
4. **Organisation/property consistency wasn't enforced across RBAC or inventory relationships** (§5.4) — e.g. nothing stopped granting a property-A user a role from organisation B, or a unit referencing a building from a different property. Fixed with composite database foreign keys plus service-layer validation.
5. **Login rate limiting used one combined `${ip}:${email}` key** (§5.5) — varying either half reset the bucket, so an attacker could spray one password across many emails from one IP, or retry one email from many IPs, without ever tripping the limit. Fixed with two independent buckets.
6. **A second, related gap found during the `allowSeparateSale` fix**: marking the parent (whole-cottage) unit itself out of order didn't block bedroom bookings, because the fix that stopped two different bedrooms from falsely colliding also stopped a bedroom booking from seeing the parent's status at all. Fixed alongside item 1 (§5.1).

Also, per the review's explicit instruction: **payments are NOT implemented in this or any prior phase.** `PAYMENT_PROVIDER=mock` exists only as an environment-config placeholder for Phase 2/3 wiring; no payment domain code, gateway integration, or Razorpay adapter exists yet. See §7, item 9.

## 2. What was implemented (original Phase 1 scope, for context)

- **Domain-based project structure** — `domains/*` (15 business domains — Property, Inventory, Reservations, Guests, Front Desk, Housekeeping, Payments, Distribution/OTA, Direct Booking, Communications, Revenue Management, Maintenance, Reporting, Identity and Access, Audit — each scaffolded with `entities/`, `rules/`, `repositories/`, `services/`, `api/`, `ui/`, `__tests__/`), `platform/*` (cross-cutting infrastructure), `providers/*` (external-integration adapter interfaces, empty pending Phase 3), `packages/*`, `app/*` (Next.js routes only — no business logic in pages). **Correction:** only 5 of the 15 domains have actual code in this phase — `identity-access`, `inventory`, `property`, `reservations` (repositories/entities only), and `audit`. The other 10 are intentionally empty scaffold folders for Phase 2/3. Git does not track empty directories, so those 10 folders were **silently absent from every commit and from the delivered bundle/zip** until this correction pass added a `.gitkeep` file to every empty directory in the whole repo (not just `domains/`) — see §7, item 10.
- **Database schema + version-controlled migrations** — all 33 tables from the mandatory core data model (Organisation through Audit Event), using Drizzle ORM against PostgreSQL. Five migrations, checked into `db/migrations/` (see §3).
- **Authentication** — email/password login, bcrypt hashing (cost 12), signed JWT sessions (`jose`, HS256) in an httpOnly/secure/sameSite cookie, session verification on every protected request, generic "invalid email or password" response (no user-enumeration), independent per-email and per-IP login rate limiting (§5.5).
- **RBAC** — a 19-key permission catalog, the 10 mandated roles (Owner, Resort Manager, Front Office, Housekeeping Supervisor/Staff, Accountant, Maintenance Staff, Revenue Manager, Administrator, Read-only Advisor) seeded with sensible default permission bundles, property-scoped role grants (a user's role is per-property, not just per-organisation) validated for organisation consistency at both the service and database layers (§5.4), and a `requirePermission` guard used at the top of every gated API route.
- **Property/inventory configuration** — Organisation, Property, Building, Unit Type, Unit, and Linked Inventory Group/Member CRUD, including a one-call `createLinkedCottage` that sets up a whole-cottage sellable unit plus N bedrooms in one transaction, with cross-property consistency validated at both the service and database layers (§5.4).
- **Audit infrastructure** — every mutating service call in this phase (property creation, unit status changes, linked-inventory setup, reservation creation/cancellation, RBAC grants) writes an `AuditEvent` row with before/after state, inside the SAME transaction as the mutation.
- **Central availability service** (`platform/availability-service`) — the core Phase 1 deliverable. Enforces every linked-inventory rule from the brief, atomically, at the database layer (details in §5 below).
- **Test framework and tests** — Vitest against a real local PostgreSQL `stayaxis_test` database (not mocks), covering linked-inventory scenarios (including `allowSeparateSale=false` and parent-OOO), concurrent booking attempts (including concurrent identical-idempotency-key races), OTA idempotency, cross-org RBAC rejection, cross-property inventory-link rejection, invalid calendar dates, and auth including the new independent rate-limit buckets. **29 tests total** (18 original + 11 added in this correction pass — see §6).
- **Error handling** — a typed `AppError` hierarchy, a single `handleApiError` used by every API route, and a standard JSON error envelope (`{ error: { code, message, details? } }`). Internal errors are logged server-side and never leak stack traces to the client.
- **Environment configuration** — a single `zod`-validated config loader (`platform/config/env.ts`) that every module reads through; `.env.example` documents every variable; `.env` (dev) and `.env.test` are separate and gitignored; the app throws loudly at startup if required config is missing rather than booting half-configured.
- **A minimal working UI slice** — login page, a dashboard placeholder behind auth (server-verified, plus a `proxy.ts` edge-level redirect for UX), using the approved dark forest-green/lime visual direction — enough to prove the auth + RBAC + availability stack end-to-end. Full PMS screens are Phase 2 scope.

## 3. Affected modules (this correction pass)

- `platform/availability-service` — `blocking-set.ts` rewritten (§5.1), `service.ts` updated to consume it and to fix the idempotency race (§5.2).
- `domains/identity-access` — `user-repository.ts` (global email lookup), `auth-service.ts` (tenant-unambiguous login + independent rate limits), `rbac-service.ts` (new validated `grantPropertyRole`), `role-repository.ts` (`findById` added, `grantUserPropertyRole` now requires `organisationId`).
- `domains/inventory` — `inventory-service.ts` (cross-property validation on `createUnit`/`createLinkedCottage`), `linked-inventory-repository.ts` (`addMember` now requires `propertyId`), `building-repository.ts` / `unit-type-repository.ts` (`findById` added).
- `domains/reservations` — `reservation-unit-repository.ts` / entities updated for the new `reservation_units.property_id` column.
- `platform/db/schema.ts` — see §3 below for the schema changes; `platform/db/seed.ts` updated to use the validated RBAC grant path.
- `app/api/auth/login/route.ts` — client-IP extraction fixed (first entry of `x-forwarded-for`, not the raw un-split header) and IP/email now passed to `authService.login` separately.
- No changes to `payments`, `distribution-ota`, `communications`, `housekeeping`, `maintenance`, `revenue-management`, `reporting`, `guests`, `front-desk`, `direct-booking` — these remain out of scope, per "do not start Phase 2."

## 4. Database changes

Five migrations in `db/migrations/`, all applied to both `stayaxis_dev` and `stayaxis_test`:

1. `0000_glamorous_caretaker.sql` — initial schema: 33 tables covering the full mandatory core data model.
2. `0001_add_reservation_unit_block_type.sql` — adds `reservation_units.block_type` (`OCCUPIED` | `LINKED_BLOCK`), distinguishing the unit a guest actually occupies from a sibling unit blocked as a side effect.
3. `0002_reservation_units_no_overlap.sql` — hand-written SQL (not expressible in Drizzle's schema DSL): enables the `btree_gist` extension and adds a Postgres `EXCLUDE` constraint on `reservation_units (unit_id, daterange(check_in, check_out, '[)'))`. **This is the actual database-enforced guarantee that no two bookings for the same unit can overlap, under any concurrency.**
4. **`0003_users_email_globally_unique.sql`** (new, this correction pass) — replaces the per-organisation unique index on `users.email` with a platform-wide one, plus a plain index on `organisation_id`. Fixes the tenant-ambiguous login bug (§5.3).
5. **`0004_cross_org_property_composite_fks.sql`** (new, this correction pass) — adds `linked_inventory_members.property_id`, `reservation_units.property_id`, and `user_property_access.organisation_id` (each backfilled from existing relationships before being made `NOT NULL`), plus composite foreign keys that force Postgres itself to reject: a `user_property_access` grant whose user/property/role don't all share one organisation; a `linked_inventory_members` row whose group and unit don't share one property; a `reservation_units` row whose reservation and unit don't share one property; a `units` row whose building or unit type don't belong to the same property as the unit. Fixes §5.4.

Money columns are `integer` (minor units) everywhere — no floats.

## 5. Corrective fixes — detail

### 5.1 `allowSeparateSale: false` enforcement + parent-OOO-blocks-children

`platform/availability-service/blocking-set.ts` was rewritten. The old `computeBlockingSet` returned one array used for both what to write and what to status-check, which couldn't represent "check the parent's status without writing a row keyed to it" — the exact asymmetry needed to keep two different bedrooms from falsely colliding while still letting a structural (parent-level) issue block every bedroom. The new `computeBookingSets` returns two sets:

- `writeSet` — units that get an actual `reservation_units` row (the concurrency-critical set, guarded by the `EXCLUDE` constraint).
- `statusCheckSet` — units whose current status (`OUT_OF_ORDER`/`INACTIVE`) must block the booking; a superset of `writeSet` in exactly one case.

Rules: booking the parent (whole cottage) uses the whole group for both sets. Booking a bedroom when `allowSeparateSale: false` also uses the whole group for both sets — this is the fix, since previously the flag was stored but never read. Booking a bedroom when `allowSeparateSale: true` writes only that bedroom's row (preserving the fix, made during original Phase 1 testing, that stopped two different bedrooms from colliding with each other), but its status-check set additionally includes the parent — this is the fix for the parent-OOO gap, since the parent is never in the write set for a separate-sale bedroom booking.

`platform/availability-service/service.ts` was updated to consume `computeBookingSets`: the OOO-check loop iterates `statusCheckSet`, the `reservation_units` insert iterates `writeSet`.

### 5.2 Idempotency race fix

`createBooking` still does a fast-path idempotency lookup before opening a transaction (an optimization for the common case — a retry arriving after the original already committed), and now also re-checks immediately inside the transaction (closes the window between that fast-path read and the transaction starting). Neither of those alone is sufficient under true concurrency: two requests can both pass a read before either commits. The actual guarantee is the existing `UNIQUE(property_id, idempotency_key)` constraint plus new handling for Postgres error `23505` (`unique_violation`) in the outer `catch` block: on that specific error, the service re-queries by idempotency key and returns the now-committed row as a replay (`replayed: true`), instead of letting a spurious error surface for what is, from the caller's perspective, a duplicate OTA retry.

### 5.3 Tenant-unambiguous login

`users.email` is now unique across the whole platform (migration `0003`), not just within an organisation. `userRepository.findByEmail(executor, email)` (renamed from `findByEmailAnyOrg`) is now genuinely unambiguous rather than "first match wins" — there is exactly one possible account per email, enforced by the database. Org-scoped lookups that still need to assert a specific organisation use the new `findByEmailInOrg(executor, organisationId, email)`.

### 5.4 Organisation/property consistency

Two layers, matching the same "enforce it in the database transaction layer, not just service code" rigor already applied to linked-inventory overlap prevention:

- **Database**: composite foreign keys (migration `0004`, detailed in §3) make it structurally impossible to insert a `user_property_access`, `linked_inventory_members`, `reservation_units`, or `units` row whose referenced entities disagree about organisation/property.
- **Service layer**: `rbacService.grantPropertyRole` (new) validates user/property/role organisation agreement before writing, and `inventoryService.createUnit`/`createLinkedCottage` validate building/unit-type property agreement before writing — both throw a clean `ValidationError` naming the mismatch, rather than letting a raw constraint-violation surface from the insert.

### 5.5 Independent IP and email rate limits

`authService.login` now takes the client IP as a plain parameter (`ip`, not a pre-combined key) and checks two independent rate-limit buckets — `login:email:<email>` (10 attempts / 15 min) and `login:ip:<ip>` (30 attempts / 15 min, deliberately looser to tolerate shared/NAT IPs) — both must pass. `app/api/auth/login/route.ts` now extracts the client IP correctly: `x-forwarded-for` can be a comma-separated chain appended to by every proxy hop, and only the first entry is the real client; the previous code used the raw, un-split header value, which meant every multi-hop request got a distinct rate-limit key and never accumulated toward any limit.

## 6. Tests run and results

```
npx tsc --noEmit         →  0 errors
npx vitest run           →  5 test files, 29 tests, 29 passed (run 4 times in a row for concurrency-flakiness confidence — stable every time)
npx next build            →  compiles cleanly (Next.js 16.3.5, Turbopack)
npm audit --omit=dev     →  0 vulnerabilities
```

New regression tests added in this correction pass (11, on top of the original 18 — full list, all passing against real local PostgreSQL, never mocks):

- `platform/availability-service/__tests__/availability-service.test.ts`:
  - rejects a booking where `checkOut` is not strictly after `checkIn` (both equal-date and reversed-date cases)
  - `allowSeparateSale=false`: booking one bedroom blocks the other, exactly like booking the whole cottage
  - marking the parent (whole-cottage) unit out of order blocks bedroom bookings too
  - 8 concurrent requests carrying the SAME idempotency key: none reject, all resolve to exactly one underlying reservation, exactly 7 are replays
- `domains/identity-access/__tests__/auth-service.test.ts`:
  - rejects creating a second user with the same email in a different organisation (proves the global-uniqueness constraint)
  - rate-limits by email independently of IP (10 attempts from 10 different IPs still trips the email bucket)
  - rate-limits by IP independently of email (30 attempts with 30 different emails still trips the IP bucket)
- `domains/identity-access/__tests__/rbac.test.ts`:
  - rejects granting a role when the user, property, and role span different organisations
- `domains/inventory/__tests__/inventory-service.test.ts` (new file):
  - `createUnit` rejects a building from a different property
  - `createUnit` rejects a unit type from a different property
  - `createLinkedCottage` rejects a building from a different property

Coverage delivered, mapped to the mandatory test list in §17 of the brief:

- Linked cottage/room availability — ✅ (full cottage blocks bedrooms; either bedroom blocks full cottage; `allowSeparateSale=false`; parent OOO blocks children)
- Concurrent reservation attempts — ✅ (2-way and 8-way concurrent races against the same unit; cottage-vs-bedroom race; 8-way concurrent identical-idempotency-key race)
- Cancellation and inventory release — ✅
- OTA idempotency / duplicate submission — ✅ (including the race condition, not just sequential retries)
- Role permissions — ✅ (granted vs. not-granted, no-access-at-all, `assertPermission` throwing, cross-org grant rejection)
- Cross-property inventory consistency — ✅ (new)
- Reservation status transitions, modification, folio/payment/refund calculations, housekeeping, failed-integration retries, rate-publication approval — **not yet implemented** (Phase 2/3 scope per the delivery plan).

I re-ran the manual end-to-end HTTP smoke test against the corrected build (`next build && next start`): login → `/api/auth/me` → create reservation via `/api/reservations` → confirmed a same-unit/overlapping-date double-booking is rejected with `409 AVAILABILITY_CONFLICT` → cancel via `/api/reservations/:id/cancel` → confirmed an unauthenticated request is rejected with `401`. All passed.

## 7. Known limitations

1. **Not yet pushed to GitHub.** All work is committed locally to a `claude-development` branch. Pushing failed: *"das007k/Resort-management is not in this session's authorized repository set... add the repository to the session's sources."* This needs write access authorized from your client's GitHub connection (read access already works, since the repo is public). Until then, the code is being delivered as a git bundle + zip.
2. A real bug was found and fixed during original Phase 1 testing (a child booking writing a row keyed to the parent unit, causing two different bedrooms to falsely collide) — see §5.1 for how this correction pass's fix builds on that one.
3. **Login rate limiting is in-memory**, scoped to a single process. It must move to a shared store (e.g. Redis) before running more than one app instance. (Independence between the email and IP buckets, §5.5, is fixed; the single-process limitation is separate and remains.)
4. ~~Out-of-order status on the parent unit itself does not block bedroom bookings~~ — **fixed in this correction pass, §5.1.**
5. **No ESLint configuration yet** — `npm run lint` is currently a placeholder. TypeScript's own strict-mode compiler (`noUncheckedIndexedAccess`, `strict: true`) is the enforced check for this phase.
6. **UI is a minimal placeholder** (login + a blank dashboard shell) — full PMS screens (reservations calendar, front desk, housekeeping board, reports) are Phase 2 scope, as planned.
7. **Reservation lifecycle is intentionally minimal** — only "create" and "cancel" exist, which is what the availability-service tests require. Modification, check-in/check-out, no-show, room movement, folios, and payments are Phase 2/3 scope.
8. **`npm audit` is clean of critical/high in production deps**; 5 moderate advisories remain in dev-only tooling (drizzle-kit's esbuild-kit chain, tsx) — tracked, not shipped.
9. **Payments are NOT implemented.** No payment domain code, no gateway integration, no Razorpay adapter. `PAYMENT_PROVIDER=mock` in `.env.example` is only an environment-config placeholder for Phase 2/3. Stated explicitly per the review's instruction.
10. **10 of the 15 scaffolded domain folders had no files and were therefore absent from every git commit** (git does not track empty directories) until this correction pass added a `.gitkeep` to every empty directory in the repository. This was a real gap between what the original report's folder-structure description implied and what was actually delivered in the commits/bundle — now fixed.
11. **Tentative-reservation expiration/auto-release is not implemented.** An earlier draft of this correction pass's task list included it, but on review it wasn't part of ChatGPT's requested fixes and is reservation-lifecycle scope (Phase 2's "core PMS"), so it was deliberately left out of this corrective, Phase-1-only pass rather than adding new functionality alongside the requested fixes. Flagging it here as a Phase 2 candidate rather than silently dropping it.

## 8. Review checklist for ChatGPT (architecture/QA)

- [ ] Confirm all six corrective fixes (§1, §5) address the findings as intended.
- [ ] Confirm the `writeSet`/`statusCheckSet` split in the availability service (§5.1) is an acceptable way to express "check the parent's status without letting it participate in concurrency-critical writes."
- [ ] Confirm the idempotency-race fix (§5.2) — fast-path check, in-transaction re-check, then `23505` handling in the catch block — is sufficient, or whether a stronger mechanism (e.g. `SELECT ... FOR UPDATE` / advisory lock on the idempotency key) is required instead.
- [ ] Confirm global email uniqueness (§5.3) is the intended tenant model — i.e. a person's email identifies exactly one account platform-wide, not one account per organisation they might work with.
- [ ] Confirm the composite-foreign-key approach to organisation/property consistency (§5.4) is acceptable, versus e.g. application-level checks only.
- [ ] Confirm the independent email/IP rate-limit thresholds (10/15min email, 30/15min IP — §5.5) are reasonable starting values.
- [ ] Confirm deferring tentative-reservation expiration to Phase 2 (§7, item 11) rather than adding it in this corrective pass is the right call.
- [ ] Decide on GitHub write access so this branch can be pushed and a PR opened to `main`, per your request to work on `claude-development` and PR into `main`.

## 9. Next step

Per the delivery rules, Phase 2 (Core PMS: reservations, guest profiles, calendar, front desk, check-in/out, folios, basic payments, housekeeping, maintenance, operational dashboard) does not begin until this corrected Phase 1 report is reviewed and approved.
