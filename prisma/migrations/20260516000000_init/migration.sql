-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENUE_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('FUTSAL', 'BADMINTON', 'BASKET', 'TENNIS', 'MINI_SOCCER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MOCK', 'MIDTRANS', 'XENDIT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "facilities" TEXT[],
    "rules" TEXT[],
    "photos" TEXT[],
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "cancellationPolicy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportType" "SportType" NOT NULL,
    "surface" TEXT NOT NULL,
    "pricePerHour" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtSchedule" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "priceOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourtSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "serviceFee" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "lockedUntil" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerTransactionId" TEXT,
    "invoiceUrl" TEXT,
    "grossAmount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rawResponse" JSONB,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhook" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "signature" TEXT,
    "payload" JSONB NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnavailableSlot" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnavailableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VenueAdmins" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE INDEX "Court_venueId_sportType_idx" ON "Court"("venueId", "sportType");

-- CreateIndex
CREATE UNIQUE INDEX "CourtSchedule_courtId_dayOfWeek_key" ON "CourtSchedule"("courtId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingCode_key" ON "Booking"("bookingCode");

-- CreateIndex
CREATE INDEX "Booking_courtId_startsAt_endsAt_idx" ON "Booking"("courtId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "UnavailableSlot_courtId_startsAt_endsAt_idx" ON "UnavailableSlot"("courtId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_venueId_key" ON "Review"("userId", "venueId");

-- CreateIndex
CREATE UNIQUE INDEX "_VenueAdmins_AB_unique" ON "_VenueAdmins"("A", "B");

-- CreateIndex
CREATE INDEX "_VenueAdmins_B_index" ON "_VenueAdmins"("B");

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtSchedule" ADD CONSTRAINT "CourtSchedule_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhook" ADD CONSTRAINT "PaymentWebhook_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnavailableSlot" ADD CONSTRAINT "UnavailableSlot_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueAdmins" ADD CONSTRAINT "_VenueAdmins_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueAdmins" ADD CONSTRAINT "_VenueAdmins_B_fkey" FOREIGN KEY ("B") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

