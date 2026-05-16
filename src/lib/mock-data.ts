import type { Booking, Payment, Venue } from "./types";

export const sportLabels: Record<string, string> = {
  FUTSAL: "Futsal",
  BADMINTON: "Badminton",
  BASKET: "Basket",
  TENNIS: "Tenis",
  MINI_SOCCER: "Mini soccer"
};

export const venues: Venue[] = [
  {
    id: "v_arena_senayan",
    name: "Arena Senayan",
    slug: "arena-senayan",
    city: "Jakarta",
    location: "Gelora, Jakarta Pusat",
    description: "Kompleks olahraga indoor premium dengan akses MRT, parkir luas, dan pilihan lapangan populer untuk komunitas.",
    facilities: ["Parkir", "Ruang ganti", "Shower", "Mushola", "Kantin", "Wi-Fi"],
    rules: ["Check-in maksimal 15 menit sebelum jadwal", "Gunakan sepatu olahraga sesuai permukaan", "Refund mengikuti kebijakan venue"],
    photos: ["https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=80"],
    opensAt: "06:00",
    closesAt: "23:00",
    cancellationPolicy: "Refund 75% untuk pembatalan minimal 24 jam sebelum jadwal.",
    rating: 4.8,
    courts: [
      { id: "c_futsal_a", venueId: "v_arena_senayan", name: "Futsal A", sportType: "FUTSAL", surface: "Vinyl", pricePerHour: 250000 },
      { id: "c_badminton_1", venueId: "v_arena_senayan", name: "Badminton 1", sportType: "BADMINTON", surface: "Karpet", pricePerHour: 90000 },
      { id: "c_basket_main", venueId: "v_arena_senayan", name: "Basket Main", sportType: "BASKET", surface: "Parquet", pricePerHour: 300000 }
    ]
  },
  {
    id: "v_rally_house",
    name: "Rally House BSD",
    slug: "rally-house-bsd",
    city: "Tangerang Selatan",
    location: "BSD City",
    description: "Venue tenis dan badminton dengan pencahayaan stabil, lounge pemain, dan reservasi fleksibel.",
    facilities: ["Lounge", "Pro shop", "Coach on request", "Parkir", "Locker"],
    rules: ["Dilarang membawa makanan ke area court", "Reschedule maksimal H-1 jika slot tersedia"],
    photos: ["https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80"],
    opensAt: "07:00",
    closesAt: "22:00",
    cancellationPolicy: "Reschedule gratis sampai 24 jam sebelum jadwal, refund diproses manual.",
    rating: 4.6,
    courts: [
      { id: "c_tennis_a", venueId: "v_rally_house", name: "Tennis A", sportType: "TENNIS", surface: "Hard court", pricePerHour: 180000 },
      { id: "c_badminton_2", venueId: "v_rally_house", name: "Badminton 2", sportType: "BADMINTON", surface: "Karpet", pricePerHour: 85000 }
    ]
  },
  {
    id: "v_green_pitch",
    name: "Green Pitch Bekasi",
    slug: "green-pitch-bekasi",
    city: "Bekasi",
    location: "Summarecon Bekasi",
    description: "Lapangan mini soccer rumput sintetis dengan tribun kecil dan jadwal malam favorit.",
    facilities: ["Tribun", "Lampu malam", "Ruang bilas", "Parkir bus kecil"],
    rules: ["Maksimal 16 pemain per sesi", "Dilarang menggunakan sepatu pull besi"],
    photos: ["https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80"],
    opensAt: "08:00",
    closesAt: "24:00",
    cancellationPolicy: "Pembatalan H-2 mendapat refund 80%, setelah itu tidak dapat refund.",
    rating: 4.7,
    courts: [
      { id: "c_minisoccer_a", venueId: "v_green_pitch", name: "Mini Soccer A", sportType: "MINI_SOCCER", surface: "Synthetic grass", pricePerHour: 450000 },
      { id: "c_futsal_b", venueId: "v_green_pitch", name: "Futsal B", sportType: "FUTSAL", surface: "Interlock", pricePerHour: 220000 }
    ]
  }
];

export const unavailableSlots = [
  { courtId: "c_futsal_a", startsAt: "2026-05-16T12:00:00+07:00", endsAt: "2026-05-16T14:00:00+07:00", reason: "Maintenance" },
  { courtId: "c_tennis_a", startsAt: "2026-05-17T18:00:00+07:00", endsAt: "2026-05-17T20:00:00+07:00", reason: "Turnamen internal" }
];

export const bookings: Booking[] = [];
export const payments: Payment[] = [];
