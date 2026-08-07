import "server-only";

import type {
  Agency as DbAgency,
  AgencyStatusHistory as DbAgencyStatusHistory,
  Booking as DbBooking,
  GroupTrip as DbGroupTrip,
  Payment as DbPayment,
  PhysicalLevel,
} from "@/generated/prisma";
import type { Agency, Booking, GroupTrip, Payment } from "@/lib/types";

/**
 * Converts real Prisma rows into the plain-JSON shapes defined in
 * `src/lib/types.ts` — the contract every dashboard component (TripCard,
 * DataTable columns, StatusBadge, KpiCard…) was already built against during
 * the UI-first pass.
 *
 * This is the seam that lets that whole component library be reused
 * unchanged: rather than teaching every consumer about `Decimal`, `Date`, and
 * Prisma's `PhysicalLevel` enum, the conversion happens once, here, at the
 * boundary where real data enters the page.
 */

const PHYSICAL_LEVEL_TO_NUMBER: Record<PhysicalLevel, 1 | 2 | 3 | 4 | 5> = {
  EASY: 1,
  MEDIUM: 2,
  SPORT: 4,
  EXPERT: 5,
};

export function mapTrip(row: DbGroupTrip): GroupTrip {
  return {
    id: row.id,
    slug: row.slug,
    agencyId: row.agencyId,
    title: row.title,
    destination: row.destination,
    tripType: row.tripType,
    status: row.status,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    durationDays: row.durationDays,
    totalPrice: Number(row.totalPrice),
    depositAmount: Number(row.depositAmount),
    totalSpots: row.totalSpots,
    bookedSpots: row.bookedSpots,
    meetingPoint: row.meetingPoint ?? "",
    description: row.description,
    inclusions: row.inclusions,
    exclusions: row.exclusions,
    // programDays is stored as free text (CDC §J.4 — a Textarea, not a
    // structured field); wrapped as a single entry so components built for
    // the mock's day-by-day array still render something rather than crash.
    program: row.programDays ? [{ day: 1, title: "Programme", detail: row.programDays }] : [],
    physicalLevel: row.physicalLevel ? PHYSICAL_LEVEL_TO_NUMBER[row.physicalLevel] : 3,
    images: row.images,
    aiTags: row.aiTags,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapBooking(row: DbBooking): Booking {
  return {
    id: row.id,
    groupTripId: row.groupTripId,
    travelRequestId: row.travelRequestId ?? undefined,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone ?? "",
    numberOfSeats: row.numberOfSeats,
    status: row.status,
    cancellationToken: row.cancellationToken,
    confirmationCode: row.confirmationCode ?? undefined,
    paymentId: row.paymentId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString(),
    remindedAt: row.remindedAt?.toISOString(),
  };
}

export function mapPayment(row: DbPayment): Payment {
  return {
    id: row.id,
    bookingId: row.bookingId,
    stripeSessionId: row.stripeSessionId,
    amount: Number(row.amount),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapAgency(row: DbAgency, statusHistory: DbAgencyStatusHistory[] = []): Agency {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    logoUrl: row.logoUrl ?? "",
    managerName: row.managerName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    zones: row.zones,
    tripTypes: row.tripTypes,
    verificationStatus: row.verificationStatus,
    proofDocUrl: row.verificationDocUrl ?? "",
    createdAt: row.createdAt.toISOString(),
    statusHistory: statusHistory.map((h) => ({
      status: h.to,
      at: h.createdAt.toISOString(),
      reason: h.reason ?? undefined,
    })),
  };
}
