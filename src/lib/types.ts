export type SportType = "FUTSAL" | "BADMINTON" | "BASKET" | "TENNIS" | "MINI_SOCCER";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "refunded";
export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "expired" | "completed";

export type Court = {
  id: string;
  venueId: string;
  name: string;
  sportType: SportType;
  surface: string;
  pricePerHour: number;
};

export type Venue = {
  id: string;
  name: string;
  slug: string;
  city: string;
  location: string;
  description: string;
  facilities: string[];
  rules: string[];
  photos: string[];
  opensAt: string;
  closesAt: string;
  cancellationPolicy: string;
  rating: number;
  courts: Court[];
};

export type Booking = {
  id: string;
  bookingCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  courtId: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
  durationHours: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: BookingStatus;
  lockedUntil?: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  bookingId: string;
  provider: "mock" | "midtrans" | "xendit";
  invoiceUrl?: string;
  transactionId?: string;
  status: PaymentStatus;
  grossAmount: number;
  expiresAt: string;
  rawResponse?: unknown;
};
