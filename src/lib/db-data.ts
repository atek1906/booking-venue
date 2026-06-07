import crypto from "crypto";
import { BookingStatus, PaymentProvider, PaymentStatus, Prisma, UserRole, type Booking, type Court, type Payment, type User } from "@prisma/client";
import { errorDetails, logger } from "@/lib/logger";
import { venues as mockVenues } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import type { Booking as BookingView, Payment as PaymentView, Venue as VenueView } from "@/lib/types";

const LOCK_MINUTES = Number(process.env.BOOKING_LOCK_MINUTES ?? 15);
const SERVICE_FEE = 5000;
export const APP_TIMEZONE = "Asia/Jakarta";

type VenueWithRelations = Prisma.VenueGetPayload<{ include: { courts: true; reviews: true } }>;
type CourtWithAvailabilityRelations = Prisma.CourtGetPayload<{
  include: {
    schedules: true;
    venue: { include: { courts: true; reviews: true } };
  };
}>;
type BookingWithRelations = Booking & {
  user: Pick<User, "name" | "email">;
  court: Court & { venue: VenueWithRelations };
  payment: Payment | null;
};

type SlotStatus = "available" | "booked" | "unavailable" | "past";

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function toMinutes(time: string) {
  const [hours, minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00+07:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatSlotTime(minutes: number) {
  const normalized = minutes % (24 * 60);
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

function toJakartaDateTime(date: string, minutes: number) {
  const day = addDays(date, Math.floor(minutes / (24 * 60)));
  return new Date(`${day}T${formatSlotTime(minutes)}:00+07:00`);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function getDayOfWeek(date: string) {
  return new Date(`${date}T12:00:00+07:00`).getUTCDay();
}

function isMockDataFallbackEnabled() {
  return process.env.MOCK_DATA_FALLBACK === "true";
}

function filterVenueViews(venues: VenueView[], filters: { sport?: string; location?: string; maxPrice?: number } = {}) {
  return venues.filter((venue) => {
    const sportMatch = !filters.sport || venue.courts.some((court) => court.sportType === filters.sport);
    const location = filters.location?.toLowerCase();
    const locationMatch = !location || `${venue.city} ${venue.location}`.toLowerCase().includes(location);
    const priceMatch = !filters.maxPrice || venue.courts.some((court) => court.pricePerHour <= Number(filters.maxPrice));
    return sportMatch && locationMatch && priceMatch;
  });
}

function fallbackVenues(error: unknown, filters: { sport?: string; location?: string; maxPrice?: number } = {}) {
  if (!isMockDataFallbackEnabled()) throw error;
  logger.warn("venue_data.mock_fallback", { error: errorDetails(error) });
  return filterVenueViews(mockVenues, filters);
}

function fallbackVenue(error: unknown, id: string) {
  if (!isMockDataFallbackEnabled()) throw error;
  logger.warn("venue_detail.mock_fallback", { id, error: errorDetails(error) });
  return mockVenues.find((venue) => venue.id === id || venue.slug === id) || null;
}

function fallbackCourt(error: unknown, courtId: string) {
  if (!isMockDataFallbackEnabled()) throw error;
  logger.warn("court_detail.mock_fallback", { courtId, error: errorDetails(error) });
  const venue = mockVenues.find((item) => item.courts.some((court) => court.id === courtId));
  const court = venue?.courts.find((item) => item.id === courtId);
  return venue && court ? { court: court as Court, venue } : null;
}

function getMockCourtAvailability(input: { courtId: string; start: string; days: number; durationHours: number }) {
  const venue = mockVenues.find((item) => item.courts.some((court) => court.id === input.courtId));
  const court = venue?.courts.find((item) => item.id === input.courtId);
  if (!venue || !court) return null;

  const durationMinutes = input.durationHours * 60;
  const now = new Date();

  return {
    court,
    venue,
    timezone: APP_TIMEZONE,
    days: Array.from({ length: input.days }, (_, dayOffset) => {
      const date = addDays(input.start, dayOffset);
      const openMinutes = toMinutes(venue.opensAt);
      let closeMinutes = toMinutes(venue.closesAt);
      if (closeMinutes <= openMinutes) closeMinutes += 24 * 60;

      const slots = [];
      for (let slotMinutes = openMinutes; slotMinutes + durationMinutes <= closeMinutes; slotMinutes += 60) {
        const startsAt = toJakartaDateTime(date, slotMinutes);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
        slots.push({
          time: formatSlotTime(slotMinutes),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          status: startsAt <= now ? "past" as const : "available" as const,
          pricePerHour: court.pricePerHour
        });
      }

      return { date, slots };
    })
  };
}

export function todayInJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export async function expireStaleBookings(now = new Date()) {
  const staleBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING_PAYMENT,
      lockedUntil: { lt: now }
    },
    select: { id: true }
  });
  const ids = staleBookings.map((booking) => booking.id);
  if (!ids.length) return 0;

  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { id: { in: ids } },
      data: { status: BookingStatus.EXPIRED }
    }),
    prisma.payment.updateMany({
      where: {
        bookingId: { in: ids },
        status: PaymentStatus.PENDING
      },
      data: { status: PaymentStatus.EXPIRED }
    })
  ]);

  return ids.length;
}

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
  try {
    const venues = await prisma.venue.findMany({
      include: { courts: { where: { isActive: true } }, reviews: true },
      orderBy: { createdAt: "asc" }
    });

    return filterVenueViews(venues.map(toVenueView), filters);
  } catch (error) {
    return fallbackVenues(error, filters);
  }
}

export async function getVenue(id: string) {
  try {
    const venue = await prisma.venue.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { courts: { where: { isActive: true } }, reviews: true }
    });
    return venue ? toVenueView(venue) : null;
  } catch (error) {
    return fallbackVenue(error, id);
  }
}

export async function getCourtWithVenue(courtId: string) {
  try {
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: { include: { courts: { where: { isActive: true } }, reviews: true } } }
    });
    if (!court) return null;
    return { court, venue: toVenueView(court.venue) };
  } catch (error) {
    return fallbackCourt(error, courtId);
  }
}

function courtScheduleForDate(court: CourtWithAvailabilityRelations, date: string) {
  const schedule = court.schedules.find((item) => item.dayOfWeek === getDayOfWeek(date));
  return {
    opensAt: schedule?.opensAt || court.venue.opensAt,
    closesAt: schedule?.closesAt || court.venue.closesAt,
    pricePerHour: schedule?.priceOverride || court.pricePerHour
  };
}

export async function getCourtAvailability(input: {
  courtId: string;
  start?: string;
  days?: number;
  durationHours?: number;
}) {
  await expireStaleBookings();

  const durationHours = Number.isInteger(input.durationHours) && input.durationHours ? input.durationHours : 1;
  if (durationHours < 1 || durationHours > 3) throw new Error("Durasi harus 1 sampai 3 jam.");

  const days = Math.min(Math.max(Number(input.days || 7), 1), 14);
  const start = input.start && /^\d{4}-\d{2}-\d{2}$/.test(input.start) ? input.start : todayInJakarta();
  const durationMinutes = durationHours * 60;

  let court: CourtWithAvailabilityRelations | null;
  try {
    court = await prisma.court.findUnique({
      where: { id: input.courtId },
      include: {
        schedules: true,
        venue: { include: { courts: { where: { isActive: true } }, reviews: true } }
      }
    });
  } catch (error) {
    if (isMockDataFallbackEnabled()) {
      logger.warn("court_availability.mock_fallback", { courtId: input.courtId, error: errorDetails(error) });
      return getMockCourtAvailability({ courtId: input.courtId, start, days, durationHours });
    }
    throw error;
  }
  if (!court && isMockDataFallbackEnabled()) {
    return getMockCourtAvailability({ courtId: input.courtId, start, days, durationHours });
  }
  if (!court || !court.isActive) return null;

  const rangeStart = toJakartaDateTime(start, 0);
  const rangeEnd = toJakartaDateTime(addDays(start, days), 0);
  const [bookings, blockedSlots] = await Promise.all([
    prisma.booking.findMany({
      where: {
        courtId: input.courtId,
        status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart }
      }
    }),
    prisma.unavailableSlot.findMany({
      where: {
        courtId: input.courtId,
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart }
      }
    })
  ]);

  const now = new Date();
  return {
    court: {
      id: court.id,
      venueId: court.venueId,
      name: court.name,
      sportType: court.sportType,
      surface: court.surface,
      pricePerHour: court.pricePerHour
    },
    venue: toVenueView(court.venue),
    timezone: APP_TIMEZONE,
    days: Array.from({ length: days }, (_, dayOffset) => {
      const date = addDays(start, dayOffset);
      const schedule = courtScheduleForDate(court, date);
      const openMinutes = toMinutes(schedule.opensAt);
      let closeMinutes = toMinutes(schedule.closesAt);
      if (closeMinutes <= openMinutes) closeMinutes += 24 * 60;

      const slots = [];
      for (let slotMinutes = openMinutes; slotMinutes + durationMinutes <= closeMinutes; slotMinutes += 60) {
        const startsAt = toJakartaDateTime(date, slotMinutes);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
        const booked = bookings.find((booking) => overlaps(startsAt, endsAt, booking.startsAt, booking.endsAt));
        const unavailable = blockedSlots.find((slot) => overlaps(startsAt, endsAt, slot.startsAt, slot.endsAt));
        const status: SlotStatus = startsAt <= now
          ? "past"
          : unavailable
            ? "unavailable"
            : booked
              ? "booked"
              : "available";

        slots.push({
          time: formatSlotTime(slotMinutes),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          status,
          reason: unavailable?.reason,
          pricePerHour: schedule.pricePerHour
        });
      }

      return { date, slots };
    })
  };
}

export async function createBooking(input: {
  courtId: string;
  date: string;
  startTime: string;
  durationHours: number;
  userId: string;
}) {
  await expireStaleBookings();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Tanggal booking tidak valid.");
  if (!/^\d{2}:\d{2}$/.test(input.startTime)) throw new Error("Jam booking tidak valid.");
  if (!Number.isInteger(input.durationHours) || input.durationHours < 1 || input.durationHours > 3) {
    throw new Error("Durasi harus 1 sampai 3 jam.");
  }

  const court = await prisma.court.findUnique({ where: { id: input.courtId } });
  if (!court) throw new Error("Lapangan tidak ditemukan.");

  const startsAt = new Date(`${input.date}T${input.startTime}:00+07:00`);
  const endsAt = new Date(startsAt.getTime() + input.durationHours * 60 * 60 * 1000);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    throw new Error("Pilih slot booking di waktu mendatang.");
  }

  const availability = await getCourtAvailability({
    courtId: input.courtId,
    start: input.date,
    days: 1,
    durationHours: input.durationHours
  });
  const selectedSlot = availability?.days[0]?.slots.find((slot) => slot.time === input.startTime);
  if (!selectedSlot || selectedSlot.status !== "available") {
    throw new Error("Slot tidak tersedia untuk jadwal yang dipilih.");
  }

  const subtotal = selectedSlot.pricePerHour * input.durationHours;

  return prisma.$transaction(async (tx) => {
    const blocked = await tx.unavailableSlot.findFirst({
      where: {
        courtId: input.courtId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt }
      }
    });
    if (blocked) throw new Error(`Slot tidak tersedia: ${blocked.reason}`);

    const activeBooking = await tx.booking.findFirst({
      where: {
        courtId: input.courtId,
        status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt }
      }
    });
    if (activeBooking) throw new Error("Slot sudah dikunci atau dibooking pengguna lain.");

    return tx.booking.create({
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
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
  method: "snap" | "mock";
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
