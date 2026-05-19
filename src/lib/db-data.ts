import crypto from "crypto";
import { BookingStatus, PaymentProvider, PaymentStatus, UserRole, type Booking, type Court, type Payment, type Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Booking as BookingView, Payment as PaymentView, Venue as VenueView } from "@/lib/types";

const LOCK_MINUTES = Number(process.env.BOOKING_LOCK_MINUTES ?? 15);
const SERVICE_FEE = 5000;

type VenueWithRelations = Prisma.VenueGetPayload<{ include: { courts: true; reviews: true } }>;
type BookingWithRelations = Booking & {
  user: Pick<User, "name" | "email">;
  court: Court & { venue: VenueWithRelations };
  payment: Payment | null;
};

export function normalizeBookingStatus(status: BookingStatus): BookingView["status"] {
  return status.toLowerCase() as BookingView["status"];
}

export function normalizePaymentStatus(status: PaymentStatus): PaymentView["status"] {
  return status.toLowerCase() as PaymentView["status"];
}

export function normalizeProvider(provider: PaymentProvider): PaymentView["provider"] {
  return provider.toLowerCase() as PaymentView["provider"];
}

export function toVenueView(venue: VenueWithRelations): VenueView {
  const rating = venue.reviews.length
    ? venue.reviews.reduce((total, review) => total + review.rating, 0) / venue.reviews.length
    : 4.7;

  return {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    city: venue.city,
    location: venue.address,
    description: venue.description,
    facilities: venue.facilities,
    rules: venue.rules,
    photos: venue.photos,
    opensAt: venue.opensAt,
    closesAt: venue.closesAt,
    cancellationPolicy: venue.cancellationPolicy,
    rating: Number(rating.toFixed(1)),
    courts: venue.courts.map((court) => ({
      id: court.id,
      venueId: court.venueId,
      name: court.name,
      sportType: court.sportType,
      surface: court.surface,
      pricePerHour: court.pricePerHour
    }))
  };
}

export function toPaymentView(payment: Payment | null): PaymentView | null {
  if (!payment) return null;
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    provider: normalizeProvider(payment.provider),
    invoiceUrl: payment.invoiceUrl ?? undefined,
    transactionId: payment.providerTransactionId ?? undefined,
    status: normalizePaymentStatus(payment.status),
    grossAmount: payment.grossAmount,
    expiresAt: payment.expiresAt?.toISOString() ?? "",
    rawResponse: payment.rawResponse
  };
}

export function toBookingView(booking: BookingWithRelations) {
  const venue = toVenueView(booking.court.venue);
  const payment = toPaymentView(booking.payment);
  return {
    booking: {
      id: booking.id,
      bookingCode: booking.bookingCode,
      userId: booking.userId,
      userName: booking.user.name,
      userEmail: booking.user.email,
      courtId: booking.courtId,
      venueId: booking.court.venueId,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      durationHours: booking.durationHours,
      subtotal: booking.subtotal,
      serviceFee: booking.serviceFee,
      total: booking.total,
      status: normalizeBookingStatus(booking.status),
      lockedUntil: booking.lockedUntil?.toISOString(),
      createdAt: booking.createdAt.toISOString()
    },
    venue,
    court: venue.courts.find((court) => court.id === booking.courtId),
    payment
  };
}

export async function listVenues(filters: { sport?: string; location?: string; maxPrice?: number } = {}) {
  const venues = await prisma.venue.findMany({
    include: { courts: { where: { isActive: true } }, reviews: true },
    orderBy: { createdAt: "asc" }
  });

  return venues.map(toVenueView).filter((venue) => {
    const sportMatch = !filters.sport || venue.courts.some((court) => court.sportType === filters.sport);
    const location = filters.location?.toLowerCase();
    const locationMatch = !location || `${venue.city} ${venue.location}`.toLowerCase().includes(location);
    const priceMatch = !filters.maxPrice || venue.courts.some((court) => court.pricePerHour <= Number(filters.maxPrice));
    return sportMatch && locationMatch && priceMatch;
  });
}

export async function getVenue(id: string) {
  const venue = await prisma.venue.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { courts: { where: { isActive: true } }, reviews: true }
  });
  return venue ? toVenueView(venue) : null;
}

export async function getCourtWithVenue(courtId: string) {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { venue: { include: { courts: { where: { isActive: true } }, reviews: true } } }
  });
  if (!court) return null;
  return { court, venue: toVenueView(court.venue) };
}

export async function createBooking(input: {
  courtId: string;
  date: string;
  startTime: string;
  durationHours: number;
  userId: string;
}) {
  const court = await prisma.court.findUnique({ where: { id: input.courtId } });
  if (!court) throw new Error("Lapangan tidak ditemukan.");

  const startsAt = new Date(`${input.date}T${input.startTime}:00+07:00`);
  const endsAt = new Date(startsAt.getTime() + input.durationHours * 60 * 60 * 1000);

  const blocked = await prisma.unavailableSlot.findFirst({
    where: {
      courtId: input.courtId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt }
    }
  });
  if (blocked) throw new Error(`Slot tidak tersedia: ${blocked.reason}`);

  const activeBooking = await prisma.booking.findFirst({
    where: {
      courtId: input.courtId,
      status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt }
    }
  });
  if (activeBooking) throw new Error("Slot sudah dikunci atau dibooking pengguna lain.");

  const subtotal = court.pricePerHour * input.durationHours;

  return prisma.booking.create({
    data: {
      bookingCode: `CB-${Date.now().toString(36).toUpperCase()}`,
      userId: input.userId,
      courtId: court.id,
      startsAt,
      endsAt,
      durationHours: input.durationHours,
      subtotal,
      serviceFee: SERVICE_FEE,
      total: subtotal + SERVICE_FEE,
      status: BookingStatus.PENDING_PAYMENT,
      lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
    }
  });
}

export async function getBookingForUser(bookingId: string, user: { id: string; role: UserRole }) {
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [{ id: bookingId }, { bookingCode: bookingId }],
      ...(user.role === UserRole.CUSTOMER ? { userId: user.id } : {})
    },
    include: {
      user: { select: { name: true, email: true } },
      payment: true,
      court: { include: { venue: { include: { courts: { where: { isActive: true } }, reviews: true } } } }
    }
  });
  return booking ? toBookingView(booking) : null;
}

export async function listBookingsForUser(user: { id: string; role: UserRole }) {
  const bookings = await prisma.booking.findMany({
    where: user.role === UserRole.CUSTOMER
      ? { userId: user.id }
      : user.role === UserRole.VENUE_ADMIN
        ? { court: { venue: { admins: { some: { id: user.id } } } } }
        : {},
    include: {
      user: { select: { name: true, email: true } },
      payment: true,
      court: { include: { venue: { include: { courts: { where: { isActive: true } }, reviews: true } } } }
    },
    orderBy: { createdAt: "desc" }
  });
  return bookings.map(toBookingView);
}

export async function createStoredPayment(input: {
  booking: Booking;
  provider: PaymentProvider;
  method: "snap" | "qris" | "mock";
  providerTransactionId?: string;
  invoiceUrl?: string;
  rawResponse?: Prisma.InputJsonValue;
}) {
  return prisma.payment.upsert({
    where: { bookingId: input.booking.id },
    update: {
      provider: input.provider,
      providerTransactionId: input.providerTransactionId,
      invoiceUrl: input.invoiceUrl,
      rawResponse: input.rawResponse
    },
    create: {
      id: crypto.randomUUID(),
      bookingId: input.booking.id,
      provider: input.provider,
      providerTransactionId: input.providerTransactionId,
      invoiceUrl: input.invoiceUrl,
      grossAmount: input.booking.total,
      status: PaymentStatus.PENDING,
      rawResponse: input.rawResponse,
      expiresAt: input.booking.lockedUntil
    }
  });
}
