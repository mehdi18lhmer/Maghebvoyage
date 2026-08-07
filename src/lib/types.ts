// Mirrors the entities/enums described in schema.prisma (see CLAUDE.md §5).
// UI-first pass: this file is the mock-data contract until Prisma is wired up.

export type AgencyVerificationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export type GroupTripStatus = "DRAFT" | "PUBLISHED" | "FULL" | "CLOSED" | "CANCELLED";

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "REFUNDED"
  | "NO_SHOW";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED";

export type TravelRequestStatus =
  | "SUBMITTED"
  | "AI_PROCESSED"
  | "MATCH_SUGGESTED"
  | "CLIENT_CONFIRMED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "CLOSED"
  | "CANCELLED";

export type TripType =
  | "CULTURAL"
  | "DESERT"
  | "BEACH"
  | "ADVENTURE"
  | "PILGRIMAGE"
  | "CITY_BREAK"
  | "TREKKING"
  | "GASTRONOMY";

export type BudgetLevel = "low" | "medium" | "high" | "premium";

export interface Agency {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string;
  managerName: string;
  contactEmail: string;
  contactPhone: string;
  zones: string[];
  tripTypes: TripType[];
  verificationStatus: AgencyVerificationStatus;
  proofDocUrl: string;
  createdAt: string;
  statusHistory: { status: AgencyVerificationStatus; at: string; reason?: string }[];
}

export interface GroupTrip {
  id: string;
  slug: string;
  agencyId: string;
  title: string;
  destination: string;
  tripType: TripType;
  status: GroupTripStatus;
  startDate: string;
  endDate: string;
  durationDays: number;
  totalPrice: number;
  depositAmount: number;
  totalSpots: number;
  bookedSpots: number;
  meetingPoint: string;
  description: string;
  inclusions: string[];
  exclusions: string[];
  program: { day: number; title: string; detail: string }[];
  physicalLevel: 1 | 2 | 3 | 4 | 5;
  images: string[];
  aiTags: string[];
  createdAt: string;
}

export interface Booking {
  id: string;
  groupTripId: string;
  travelRequestId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  numberOfSeats: number;
  status: BookingStatus;
  cancellationToken: string;
  confirmationCode?: string;
  paymentId?: string;
  createdAt: string;
  cancelledAt?: string;
  remindedAt?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  stripeSessionId: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface TravelRequest {
  id: string;
  status: TravelRequestStatus;
  destination: string;
  dateFlexible: boolean;
  travelerCount: number;
  adults: number;
  children: number;
  budgetMax: number;
  tripTypes: TripType[];
  clientName: string;
  clientEmail: string;
  createdAt: string;
  summary?: string;
  tags?: string[];
  matchedTripIds?: string[];
}
