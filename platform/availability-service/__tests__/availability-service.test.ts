import { describe, it, expect } from "vitest";
import { availabilityService } from "@/platform/availability-service/service";
import { inventoryService } from "@/domains/inventory/services/inventory-service";
import { AvailabilityConflictError, ValidationError } from "@/platform/observability/errors";
import { createLinkedCottageFixture, createStandaloneUnitFixture } from "@/tests/helpers/fixtures";

// Mandatory principle §6/§17: automated tests for every linked-inventory
// scenario, including concurrent booking attempts. These run against a real
// local Postgres (stayaxis_test) — the guarantee under test is the database
// EXCLUDE constraint, not application-level locking, so an in-memory/mocked
// DB would not actually prove anything here.

describe("availability service — linked inventory", () => {
  it("booking the full cottage blocks both bedrooms", async () => {
    const { property, cottageUnit, bedroomA } = await createLinkedCottageFixture();

    await availabilityService.createBooking({
      propertyId: property.id,
      unitId: cottageUnit.id,
      checkIn: "2026-12-01",
      checkOut: "2026-12-05",
      source: "MANUAL",
    });

    await expect(
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: bedroomA.id,
        checkIn: "2026-12-02",
        checkOut: "2026-12-03",
        source: "MANUAL",
      }),
    ).rejects.toBeInstanceOf(AvailabilityConflictError);
  });

  it("booking either bedroom blocks full-cottage availability", async () => {
    const { property, cottageUnit, bedroomA } = await createLinkedCottageFixture();

    await availabilityService.createBooking({
      propertyId: property.id,
      unitId: bedroomA.id,
      checkIn: "2026-12-10",
      checkOut: "2026-12-12",
      source: "MANUAL",
    });

    await expect(
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: cottageUnit.id,
        checkIn: "2026-12-11",
        checkOut: "2026-12-13",
        source: "MANUAL",
      }),
    ).rejects.toBeInstanceOf(AvailabilityConflictError);
  });

  it("both bedrooms may be sold separately when permitted", async () => {
    const { property, bedroomA, bedroomB } = await createLinkedCottageFixture({ allowSeparateSale: true });

    const bookingA = await availabilityService.createBooking({
      propertyId: property.id,
      unitId: bedroomA.id,
      checkIn: "2026-12-15",
      checkOut: "2026-12-18",
      source: "MANUAL",
    });
    const bookingB = await availabilityService.createBooking({
      propertyId: property.id,
      unitId: bedroomB.id,
      checkIn: "2026-12-15",
      checkOut: "2026-12-18",
      source: "MANUAL",
    });

    expect(bookingA.reservation.id).not.toBe(bookingB.reservation.id);
    expect(bookingA.blockedUnitIds.sort()).not.toEqual(bookingB.blockedUnitIds.sort());
  });

  it("non-overlapping dates on the same unit can both be booked", async () => {
    const { property, bedroomA } = await createLinkedCottageFixture();

    await availabilityService.createBooking({
      propertyId: property.id,
      unitId: bedroomA.id,
      checkIn: "2027-01-01",
      checkOut: "2027-01-05",
      source: "MANUAL",
    });

    // Back-to-back stay starting exactly on the previous checkout date — the
    // range is exclusive of checkOut, so this must NOT conflict.
    const second = await availabilityService.createBooking({
      propertyId: property.id,
      unitId: bedroomA.id,
      checkIn: "2027-01-05",
      checkOut: "2027-01-08",
      source: "MANUAL",
    });

    expect(second.reservation.status).toBe("CONFIRMED");
  });

  it("cancelling a booking recalculates availability and frees the unit", async () => {
    const { property, cottageUnit, bedroomA } = await createLinkedCottageFixture();

    const booking = await availabilityService.createBooking({
      propertyId: property.id,
      unitId: cottageUnit.id,
      checkIn: "2026-12-20",
      checkOut: "2026-12-22",
      source: "MANUAL",
    });

    await availabilityService.cancelBooking(booking.reservation.id);

    // Now bookable again, including via a linked sibling unit.
    const rebooking = await availabilityService.createBooking({
      propertyId: property.id,
      unitId: bedroomA.id,
      checkIn: "2026-12-20",
      checkOut: "2026-12-22",
      source: "MANUAL",
    });
    expect(rebooking.reservation.status).toBe("CONFIRMED");
  });

  it("out-of-order status blocks the affected inventory", async () => {
    const { property, cottageUnit, bedroomA } = await createLinkedCottageFixture();

    await inventoryService.setUnitStatus(bedroomA.id, "OUT_OF_ORDER");

    // Booking the bedroom directly is blocked.
    await expect(
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: bedroomA.id,
        checkIn: "2026-12-24",
        checkOut: "2026-12-26",
        source: "MANUAL",
      }),
    ).rejects.toBeInstanceOf(AvailabilityConflictError);

    // Booking the whole cottage is ALSO blocked, since it would occupy the
    // out-of-order bedroom too.
    await expect(
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: cottageUnit.id,
        checkIn: "2026-12-24",
        checkOut: "2026-12-26",
        source: "MANUAL",
      }),
    ).rejects.toBeInstanceOf(AvailabilityConflictError);
  });

  it("standalone (non-linked) units are unaffected by sibling logic", async () => {
    const { property, unit } = await createStandaloneUnitFixture();

    const booking = await availabilityService.createBooking({
      propertyId: property.id,
      unitId: unit.id,
      checkIn: "2027-02-01",
      checkOut: "2027-02-03",
      source: "MANUAL",
    });

    expect(booking.blockedUnitIds).toEqual([unit.id]);
  });

  it("rejects a booking where checkOut is not after checkIn", async () => {
    const { property, unit } = await createStandaloneUnitFixture();

    await expect(
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: unit.id,
        checkIn: "2027-06-10",
        checkOut: "2027-06-10", // same day — invalid, must be strictly after
        source: "MANUAL",
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: unit.id,
        checkIn: "2027-06-15",
        checkOut: "2027-06-10", // checkOut before checkIn — invalid
        source: "MANUAL",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  // Review fix (bug #1): allowSeparateSale=false was stored but never read,
  // so bedrooms stayed independently bookable even when a property's config
  // said they shouldn't be. This is the regression test for that fix.
  it("allowSeparateSale=false: booking one bedroom blocks the other, exactly like booking the whole cottage", async () => {
    const { property, bedroomA, bedroomB } = await createLinkedCottageFixture({ allowSeparateSale: false });

    await availabilityService.createBooking({
      propertyId: property.id,
      unitId: bedroomA.id,
      checkIn: "2027-07-01",
      checkOut: "2027-07-04",
      source: "MANUAL",
    });

    await expect(
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: bedroomB.id,
        checkIn: "2027-07-02",
        checkOut: "2027-07-03",
        source: "MANUAL",
      }),
    ).rejects.toBeInstanceOf(AvailabilityConflictError);
  });

  // Review fix (bug/task #19): a child's write-set no longer includes the
  // parent (to avoid two different bedrooms falsely colliding via a
  // shared parent-keyed row), which silently stopped the parent's own
  // OUT_OF_ORDER status from blocking bedroom bookings. blocking-set.ts now
  // adds the parent to the (read-only) statusCheckSet for this case.
  it("marking the PARENT (whole-cottage) unit out of order blocks bedroom bookings too", async () => {
    const { property, cottageUnit, bedroomA } = await createLinkedCottageFixture({ allowSeparateSale: true });

    await inventoryService.setUnitStatus(cottageUnit.id, "OUT_OF_ORDER");

    await expect(
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: bedroomA.id,
        checkIn: "2027-07-10",
        checkOut: "2027-07-12",
        source: "MANUAL",
      }),
    ).rejects.toBeInstanceOf(AvailabilityConflictError);
  });
});

describe("availability service — OTA idempotency", () => {
  it("a retried OTA submission with the same idempotency key does not create a duplicate reservation", async () => {
    const { property, bedroomA } = await createLinkedCottageFixture();
    const idempotencyKey = "ota-ext-12345";

    const first = await availabilityService.createBooking({
      propertyId: property.id,
      unitId: bedroomA.id,
      checkIn: "2027-03-01",
      checkOut: "2027-03-04",
      source: "OTA",
      externalReference: "BOOKINGCOM-98765",
      idempotencyKey,
    });

    const retry = await availabilityService.createBooking({
      propertyId: property.id,
      unitId: bedroomA.id,
      checkIn: "2027-03-01",
      checkOut: "2027-03-04",
      source: "OTA",
      externalReference: "BOOKINGCOM-98765",
      idempotencyKey,
    });

    expect(retry.reservation.id).toBe(first.reservation.id);
    expect(retry.replayed).toBe(true);
    expect(first.replayed).toBe(false);
  });
});

describe("availability service — concurrency", () => {
  it("two concurrent bookings for the SAME unit and overlapping dates: exactly one succeeds", async () => {
    const { property, bedroomA } = await createLinkedCottageFixture();

    const attempt = () =>
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: bedroomA.id,
        checkIn: "2027-04-01",
        checkOut: "2027-04-05",
        source: "DIRECT",
      });

    const results = await Promise.allSettled([attempt(), attempt()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(AvailabilityConflictError);
  });

  it("concurrent bookings for the whole cottage vs. one of its bedrooms: exactly one succeeds", async () => {
    const { property, cottageUnit, bedroomA } = await createLinkedCottageFixture();

    const results = await Promise.allSettled([
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: cottageUnit.id,
        checkIn: "2027-04-10",
        checkOut: "2027-04-15",
        source: "DIRECT",
      }),
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: bedroomA.id,
        checkIn: "2027-04-12",
        checkOut: "2027-04-13",
        source: "OTA",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);
  });

  it("many concurrent attempts for the same unit: exactly one wins", async () => {
    const { property, bedroomB } = await createLinkedCottageFixture();
    const CONCURRENT_ATTEMPTS = 8;

    const attempt = () =>
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: bedroomB.id,
        checkIn: "2027-05-01",
        checkOut: "2027-05-03",
        source: "MANUAL",
      });

    const results = await Promise.allSettled(Array.from({ length: CONCURRENT_ATTEMPTS }, attempt));
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(CONCURRENT_ATTEMPTS - 1);
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(AvailabilityConflictError);
    }
  });

  // Review fix (bug #2): the idempotency lookup ran BEFORE the transaction,
  // so two concurrent requests carrying the SAME idempotency key could both
  // pass that read before either committed, then race on the INSERT. The
  // loser used to surface a raw/opaque error instead of a clean replay. This
  // proves every concurrent attempt with the same key converges on exactly
  // ONE underlying reservation, and none of them reject.
  it("concurrent requests with the SAME idempotency key: all resolve to exactly one reservation, none reject", async () => {
    const { property, bedroomA } = await createLinkedCottageFixture();
    const idempotencyKey = "ota-race-67890";
    const CONCURRENT_ATTEMPTS = 8;

    const attempt = () =>
      availabilityService.createBooking({
        propertyId: property.id,
        unitId: bedroomA.id,
        checkIn: "2027-05-10",
        checkOut: "2027-05-12",
        source: "OTA",
        externalReference: "OTA-RACE-1",
        idempotencyKey,
      });

    const results = await Promise.allSettled(Array.from({ length: CONCURRENT_ATTEMPTS }, attempt));

    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(0);

    const fulfilled = results as PromiseFulfilledResult<Awaited<ReturnType<typeof attempt>>>[];
    const reservationIds = new Set(fulfilled.map((r) => r.value.reservation.id));
    expect(reservationIds.size).toBe(1);

    // Exactly one of the concurrent attempts actually created the
    // reservation; every other one is a replay of it.
    const replayedCount = fulfilled.filter((r) => r.value.replayed).length;
    expect(replayedCount).toBe(CONCURRENT_ATTEMPTS - 1);
  });
});
