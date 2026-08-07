-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENCY', 'CLIENT');

-- CreateEnum
CREATE TYPE "AgencyVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FULL', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('DESERT', 'TREKKING', 'BEACH', 'CULTURAL', 'ADVENTURE', 'CITY_BREAK', 'GASTRONOMY', 'PILGRIMAGE');

-- CreateEnum
CREATE TYPE "PhysicalLevel" AS ENUM ('EASY', 'MEDIUM', 'SPORT', 'EXPERT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TravelRequestStatus" AS ENUM ('SUBMITTED', 'AI_PROCESSED', 'MATCH_SUGGESTED', 'CLIENT_CONFIRMED', 'PAYMENT_PENDING', 'PAID', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zones" TEXT[],
    "tripTypes" "TripType"[],
    "logoUrl" TEXT,
    "registrationNumber" TEXT,
    "verificationStatus" "AgencyVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationDocUrl" TEXT,
    "verificationNote" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyStatusHistory" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "from" "AgencyVerificationStatus",
    "to" "AgencyVerificationStatus" NOT NULL,
    "reason" TEXT,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupTrip" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "images" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "depositAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalSpots" INTEGER NOT NULL,
    "bookedSpots" INTEGER NOT NULL DEFAULT 0,
    "tripType" "TripType" NOT NULL,
    "inclusions" TEXT[],
    "exclusions" TEXT[],
    "meetingPoint" TEXT,
    "programDays" TEXT,
    "guideLanguages" TEXT[],
    "physicalLevel" "PhysicalLevel",
    "aiTags" TEXT[],
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "groupTripId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "travelRequestId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientCountry" TEXT,
    "numberOfSeats" INTEGER NOT NULL DEFAULT 1,
    "depositPaid" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "confirmationCode" TEXT,
    "cancellationToken" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "notes" TEXT,
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "groupTripId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeCustomerEmail" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentType" TEXT NOT NULL DEFAULT 'deposit',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "rawProviderResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequest" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "dateFlexible" BOOLEAN NOT NULL,
    "exactStartDate" TIMESTAMP(3),
    "exactEndDate" TIMESTAMP(3),
    "desiredDurationDays" INTEGER,
    "travelerCount" INTEGER NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "budgetMax" DECIMAL(10,2) NOT NULL,
    "tripTypes" "TripType"[],
    "style" TEXT,
    "accommodation" TEXT,
    "transportIncluded" BOOLEAN NOT NULL DEFAULT false,
    "activities" TEXT,
    "constraints" TEXT,
    "language" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientCountry" TEXT,
    "gdprConsent" BOOLEAN NOT NULL,
    "termsAccepted" BOOLEAN NOT NULL,
    "summary" TEXT,
    "aiTags" TEXT[],
    "complexity" INTEGER,
    "destinationNormalized" TEXT,
    "budgetLevel" TEXT,
    "dominantTripType" "TripType",
    "usedFallback" BOOLEAN NOT NULL DEFAULT false,
    "matchedTripIds" TEXT[],
    "status" "TravelRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequestStatusHistory" (
    "id" TEXT NOT NULL,
    "travelRequestId" TEXT NOT NULL,
    "from" "TravelRequestStatus",
    "to" "TravelRequestStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelRequestStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNote" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "groupTripId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_contactEmail_key" ON "Agency"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_userId_key" ON "Agency"("userId");

-- CreateIndex
CREATE INDEX "Agency_verificationStatus_createdAt_idx" ON "Agency"("verificationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "AgencyStatusHistory_agencyId_createdAt_idx" ON "AgencyStatusHistory"("agencyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupTrip_slug_key" ON "GroupTrip"("slug");

-- CreateIndex
CREATE INDEX "GroupTrip_status_startDate_idx" ON "GroupTrip"("status", "startDate");

-- CreateIndex
CREATE INDEX "GroupTrip_agencyId_status_idx" ON "GroupTrip"("agencyId", "status");

-- CreateIndex
CREATE INDEX "GroupTrip_destination_idx" ON "GroupTrip"("destination");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_confirmationCode_key" ON "Booking"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_cancellationToken_key" ON "Booking"("cancellationToken");

-- CreateIndex
CREATE INDEX "Booking_status_remindedAt_idx" ON "Booking"("status", "remindedAt");

-- CreateIndex
CREATE INDEX "Booking_agencyId_status_idx" ON "Booking"("agencyId", "status");

-- CreateIndex
CREATE INDEX "Booking_groupTripId_status_idx" ON "Booking"("groupTripId", "status");

-- CreateIndex
CREATE INDEX "Booking_clientEmail_idx" ON "Booking"("clientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Payment_agencyId_status_idx" ON "Payment"("agencyId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");

-- CreateIndex
CREATE INDEX "TravelRequest_status_createdAt_idx" ON "TravelRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TravelRequest_clientEmail_idx" ON "TravelRequest"("clientEmail");

-- CreateIndex
CREATE INDEX "TravelRequestStatusHistory_travelRequestId_createdAt_idx" ON "TravelRequestStatusHistory"("travelRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminNote_groupTripId_createdAt_idx" ON "AdminNote"("groupTripId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyStatusHistory" ADD CONSTRAINT "AgencyStatusHistory_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTrip" ADD CONSTRAINT "GroupTrip_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_groupTripId_fkey" FOREIGN KEY ("groupTripId") REFERENCES "GroupTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_travelRequestId_fkey" FOREIGN KEY ("travelRequestId") REFERENCES "TravelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_groupTripId_fkey" FOREIGN KEY ("groupTripId") REFERENCES "GroupTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequestStatusHistory" ADD CONSTRAINT "TravelRequestStatusHistory_travelRequestId_fkey" FOREIGN KEY ("travelRequestId") REFERENCES "TravelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_groupTripId_fkey" FOREIGN KEY ("groupTripId") REFERENCES "GroupTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
