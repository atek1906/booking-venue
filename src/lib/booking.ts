import crypto from "crypto";
import { bookings, payments, unavailableSlots, venues } from "./mock-data";
import type { Booking, BookingStatus, Court, Payment } from "./types";

const LOCK_MINUTES = Number(process.env.BOOKING_LOCK_MINUTES ?? 15);
const SERVICE_FEE = 5000;

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function findCourt(courtId: string): Court | undefined {
  return venues.flatMap((venue) => venue.courts).find((court) => court.id === courtId);
}

export function findVenueByCourt(courtId: string) {
  return venues.find((venue) => venue.courts.some((court) => court.id === courtId));
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export function expireStaleBookings() {
  const now = new Date();
  for (const booking of bookings) {
    if (booking.status === "pending_payment" && booking.lockedUntil && new Date(booking.lockedUntil) < now) {
      booking.status = "expired";
      const payment = payments.find((item) => item.bookingId === booking.id);
      if (payment && payment.status === "pending") payment.status = "expired";
    }
  }
}

export function assertSlotAvailable(courtId: string, startsAt: Date, endsAt: Date) {
  expireStaleBookings();
  const blocked = unavailableSlots.find((slot) => (
    slot.courtId === courtId && overlaps(startsAt, endsAt, new Date(slot.startsAt), new Date(slot.endsAt))
  ));
  if (blocked) throw new Error(`Slot tidak tersedia: ${blocked.reason}`);

  const activeBooking = bookings.find((booking) => (
    booking.courtId === courtId &&
    ["pending_payment", "confirmed"].includes(booking.status) &&
    overlaps(startsAt, endsAt, new Date(booking.startsAt), new Date(booking.endsAt))
  ));
  if (activeBooking) throw new Error("Slot sudah dikunci atau dibooking pengguna lain.");
}

export function createBooking(input: {
  courtId: string;
  date: string;
  startTime: string;
  durationHours: number;
  userName?: string;
  userEmail?: string;
}) {
  const court = findCourt(input.courtId);
  const venue = findVenueByCourt(input.courtId);
  if (!court || !venue) throw new Error("Lapangan tidak ditemukan.");

  const startsAt = new Date(`${input.date}T${input.startTime}:00+07:00`);
  const endsAt = new Date(startsAt.getTime() + input.durationHours * 60 * 60 * 1000);
  assertSlotAvailable(input.courtId, startsAt, endsAt);

  const subtotal = court.pricePerHour * input.durationHours;
  const booking: Booking = {
    id: crypto.randomUUID(),
    bookingCode: `CB-${Date.now().toString(36).toUpperCase()}`,
    userId: "demo-user",
    userName: input.userName || "Customer Demo",
    userEmail: input.userEmail || "user@courtbook.test",
    courtId: court.id,
    venueId: venue.id,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    durationHours: input.durationHours,
    subtotal,
    serviceFee: SERVICE_FEE,
    total: subtotal + SERVICE_FEE,
    status: "pending_payment",
    lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  bookings.push(booking);
  return booking;
}

export function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const booking = bookings.find((item) => item.id === bookingId);
  if (!booking) throw new Error("Booking tidak ditemukan.");
  booking.status = status;
  return booking;
}

export function createPaymentForBooking(booking: Booking): Payment {
  const existing = payments.find((item) => item.bookingId === booking.id);
  if (existing) return existing;

  const payment: Payment = {
    id: crypto.randomUUID(),
    bookingId: booking.id,
    provider: (process.env.PAYMENT_GATEWAY === "midtrans" ? "midtrans" : "mock"),
    invoiceUrl: `/payment/status?bookingId=${booking.id}`,
    transactionId: `PAY-${Date.now()}`,
    status: "pending",
    grossAmount: booking.total,
    expiresAt: booking.lockedUntil || new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
  };
  payments.push(payment);
  return payment;
}

export function getBookingView(booking: Booking) {
  const venue = venues.find((item) => item.id === booking.venueId);
  const court = findCourt(booking.courtId);
  const payment = payments.find((item) => item.bookingId === booking.id);
  return { booking, venue, court, payment };
}
