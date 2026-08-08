/**
 * CDC §7.2 test #1 — "Race condition : simuler deux réservations simultanées
 * sur la dernière place."
 *
 * This is the highest-priority test in the spec and the one bug that quietly
 * oversells a departure, so it is verified against a real Postgres rather than
 * reasoned about. Run with:
 *
 *   DATABASE_URL=... npx tsx scripts/verify-race-condition.mts
 *
 * Three scenarios:
 *   1. N concurrent webhooks racing for 1 remaining seat → exactly 1 wins
 *   2. the same Stripe session delivered twice → the second is a no-op
 *   3. cancelling a seat on a FULL trip → seat returns, status back to PUBLISHED
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL required");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const CONCURRENCY = 8;
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`   ${ok ? "PASS" : "FAIL"}  ${label}  (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}

/** Mirrors the conditional claim in bookings.service.ts exactly. */
async function claimSeat(groupTripId: string, seats: number): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "GroupTrip"
    SET "bookedSpots" = "bookedSpots" + ${seats},
        "status" = CASE
          WHEN "bookedSpots" + ${seats} >= "totalSpots" THEN 'FULL'::"TripStatus"
          ELSE "status"
        END,
        "updatedAt" = NOW()
    WHERE "id" = ${groupTripId}
      AND "bookedSpots" + ${seats} <= "totalSpots"
  `;
}

async function seedFixture(bookedSpots: number, totalSpots: number) {
  const suffix = Math.random().toString(36).slice(2, 10);

  const user = await prisma.user.create({
    data: { email: `agency-${suffix}@test.local`, role: "AGENCY" },
  });
  const agency = await prisma.agency.create({
    data: {
      slug: `agency-${suffix}`,
      name: "Test Agency",
      description: "fixture",
      managerName: "T",
      contactEmail: `contact-${suffix}@test.local`,
      contactPhone: "+212600000000",
      country: "Maroc",
      city: "Marrakech",
      zones: ["Maroc"],
      tripTypes: ["DESERT"],
      verificationStatus: "VERIFIED",
      userId: user.id,
    },
  });
  const trip = await prisma.groupTrip.create({
    data: {
      agencyId: agency.id,
      title: `Race fixture ${suffix}`,
      slug: `race-fixture-${suffix}`,
      destination: "Merzouga",
      description: "x".repeat(200),
      tripType: "DESERT",
      startDate: new Date(Date.now() + 30 * 86_400_000),
      endDate: new Date(Date.now() + 33 * 86_400_000),
      durationDays: 3,
      totalPrice: "500",
      depositAmount: "100",
      totalSpots,
      bookedSpots,
      status: bookedSpots >= totalSpots ? "FULL" : "PUBLISHED",
      coverImage: "https://example.com/x.jpg",
    },
  });
  return { agency, trip };
}

async function scenarioRace() {
  console.log(`\n1. ${CONCURRENCY} concurrent webhooks, 1 seat left`);
  const { trip } = await seedFixture(11, 12);

  // Fired without awaiting in between — genuinely concurrent, not sequential.
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => claimSeat(trip.id, 1))
  );

  const winners = results.filter((r) => r === 1).length;
  const after = await prisma.groupTrip.findUniqueOrThrow({ where: { id: trip.id } });

  check("exactly one claim succeeded", winners, 1);
  check("bookedSpots never exceeds capacity", after.bookedSpots, 12);
  check("status auto-flipped to FULL", after.status, "FULL");
}

async function scenarioMultiSeatRace() {
  console.log(`\n2. concurrent 3-seat requests, 4 seats left (only one can fit twice)`);
  const { trip } = await seedFixture(6, 10);

  const results = await Promise.all([
    claimSeat(trip.id, 3),
    claimSeat(trip.id, 3),
    claimSeat(trip.id, 3),
  ]);
  const winners = results.filter((r) => r === 1).length;
  const after = await prisma.groupTrip.findUniqueOrThrow({ where: { id: trip.id } });

  check("exactly one 3-seat claim fit", winners, 1);
  check("bookedSpots within capacity", after.bookedSpots <= after.totalSpots, true);
  check("bookedSpots is 9", after.bookedSpots, 9);
}

async function scenarioIdempotency() {
  console.log("\n3. same Stripe session delivered twice");
  const { agency, trip } = await seedFixture(0, 10);

  const booking = await prisma.booking.create({
    data: {
      groupTripId: trip.id,
      agencyId: agency.id,
      clientName: "Ahmed",
      clientEmail: "ahmed@test.local",
      numberOfSeats: 1,
      totalAmount: "500",
    },
  });

  const sessionId = `cs_test_${Math.random().toString(36).slice(2)}`;
  const paymentData = {
    bookingId: booking.id,
    groupTripId: trip.id,
    agencyId: agency.id,
    stripeSessionId: sessionId,
    stripeCustomerEmail: "ahmed@test.local",
    amount: "100",
    status: "SUCCEEDED" as const,
    paidAt: new Date(),
  };

  await prisma.payment.create({ data: paymentData });

  // Second delivery: the unique index must reject it even if application-level
  // checks were bypassed.
  let rejected = false;
  try {
    await prisma.payment.create({ data: paymentData });
  } catch {
    rejected = true;
  }

  const count = await prisma.payment.count({ where: { stripeSessionId: sessionId } });
  check("duplicate insert rejected by unique index", rejected, true);
  check("exactly one payment row exists", count, 1);
}

async function scenarioCancelRestores() {
  console.log("\n4. cancelling a seat on a FULL trip");
  const { trip } = await seedFixture(12, 12);

  await prisma.$executeRaw`
    UPDATE "GroupTrip"
    SET "bookedSpots" = GREATEST(0, "bookedSpots" - ${1}),
        "status" = CASE WHEN "status" = 'FULL'::"TripStatus" THEN 'PUBLISHED'::"TripStatus" ELSE "status" END,
        "updatedAt" = NOW()
    WHERE "id" = ${trip.id}
  `;

  const after = await prisma.groupTrip.findUniqueOrThrow({ where: { id: trip.id } });
  check("seat released", after.bookedSpots, 11);
  check("FULL reverted to PUBLISHED", after.status, "PUBLISHED");
}

async function scenarioNeverNegative() {
  console.log("\n5. over-cancelling cannot drive bookedSpots negative");
  const { trip } = await seedFixture(1, 10);
  await prisma.$executeRaw`
    UPDATE "GroupTrip" SET "bookedSpots" = GREATEST(0, "bookedSpots" - ${5}) WHERE "id" = ${trip.id}
  `;
  const after = await prisma.groupTrip.findUniqueOrThrow({ where: { id: trip.id } });
  check("clamped at zero", after.bookedSpots, 0);
}

async function main() {
  await scenarioRace();
  await scenarioMultiSeatRace();
  await scenarioIdempotency();
  await scenarioCancelRestores();
  await scenarioNeverNegative();

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
