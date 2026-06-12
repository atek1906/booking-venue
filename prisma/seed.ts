import { loadEnvConfig } from "@next/env";
import { PrismaClient, SportType, UserRole } from "@prisma/client";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

function jakartaDate(daysFromToday: number, time: string) {
  const now = new Date();
  const jakartaToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const base = new Date(`${jakartaToday}T12:00:00+07:00`);
  base.setUTCDate(base.getUTCDate() + daysFromToday);
  return new Date(`${base.toISOString().slice(0, 10)}T${time}:00+07:00`);
}

const venueSeeds = [
  {
    name: "Arena Senayan",
    slug: "arena-senayan",
    description: "Kompleks olahraga indoor premium dengan akses MRT, parkir luas, dan pilihan lapangan populer untuk komunitas.",
    city: "Jakarta",
    address: "Gelora, Jakarta Pusat",
    facilities: ["Parkir", "Ruang ganti", "Shower", "Mushola", "Kantin", "Wi-Fi"],
    rules: ["Check-in maksimal 15 menit sebelum jadwal", "Gunakan sepatu olahraga sesuai permukaan", "Refund mengikuti kebijakan venue"],
    photos: [
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80"
    ],
    opensAt: "06:00",
    closesAt: "23:00",
    cancellationPolicy: "Refund 75% untuk pembatalan minimal 24 jam sebelum jadwal.",
    courts: [
      { name: "Futsal A", sportType: SportType.FUTSAL, surface: "Vinyl", pricePerHour: 250000 },
      { name: "Badminton 1", sportType: SportType.BADMINTON, surface: "Karpet", pricePerHour: 90000 },
      { name: "Basket Main", sportType: SportType.BASKET, surface: "Parquet", pricePerHour: 300000 }
    ]
  },
  {
    name: "Rally House BSD",
    slug: "rally-house-bsd",
    description: "Venue tenis dan badminton dengan pencahayaan stabil, lounge pemain, dan reservasi fleksibel.",
    city: "Tangerang Selatan",
    address: "BSD City",
    facilities: ["Lounge", "Pro shop", "Coach on request", "Parkir", "Locker"],
    rules: ["Dilarang membawa makanan ke area court", "Reschedule maksimal H-1 jika slot tersedia"],
    photos: [
      "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1530915365347-e35b749a0381?auto=format&fit=crop&w=1200&q=80"
    ],
    opensAt: "07:00",
    closesAt: "22:00",
    cancellationPolicy: "Reschedule gratis sampai 24 jam sebelum jadwal, refund diproses manual.",
    courts: [
      { name: "Tennis A", sportType: SportType.TENNIS, surface: "Hard court", pricePerHour: 180000 },
      { name: "Badminton 2", sportType: SportType.BADMINTON, surface: "Karpet", pricePerHour: 85000 }
    ]
  },
  {
    name: "Green Pitch Bekasi",
    slug: "green-pitch-bekasi",
    description: "Lapangan mini soccer rumput sintetis dengan tribun kecil dan jadwal malam favorit.",
    city: "Bekasi",
    address: "Summarecon Bekasi",
    facilities: ["Tribun", "Lampu malam", "Ruang bilas", "Parkir bus kecil"],
    rules: ["Maksimal 16 pemain per sesi", "Dilarang menggunakan sepatu pull besi"],
    photos: [
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80"
    ],
    opensAt: "08:00",
    closesAt: "24:00",
    cancellationPolicy: "Pembatalan H-2 mendapat refund 80%, setelah itu tidak dapat refund.",
    courts: [
      { name: "Mini Soccer A", sportType: SportType.MINI_SOCCER, surface: "Synthetic grass", pricePerHour: 450000 },
      { name: "Futsal B", sportType: SportType.FUTSAL, surface: "Interlock", pricePerHour: 220000 }
    ]
  }
];

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@courtbook.test" },
    update: { role: UserRole.VENUE_ADMIN },
    create: {
      name: "Admin CourtBook",
      email: "admin@courtbook.test",
      phone: "+6281200000000",
      role: UserRole.VENUE_ADMIN
    }
  });

  const customer = await prisma.user.upsert({
    where: { email: "user@courtbook.test" },
    update: { role: UserRole.CUSTOMER },
    create: {
      name: "Customer Demo",
      email: "user@courtbook.test",
      phone: "+6281300000000",
      role: UserRole.CUSTOMER
    }
  });

  for (const item of venueSeeds) {
    const venue = await prisma.venue.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        city: item.city,
        address: item.address,
        facilities: item.facilities,
        rules: item.rules,
        photos: item.photos,
        opensAt: item.opensAt,
        closesAt: item.closesAt,
        cancellationPolicy: item.cancellationPolicy,
        admins: { connect: { id: admin.id } }
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        city: item.city,
        address: item.address,
        facilities: item.facilities,
        rules: item.rules,
        photos: item.photos,
        opensAt: item.opensAt,
        closesAt: item.closesAt,
        cancellationPolicy: item.cancellationPolicy,
        admins: { connect: { id: admin.id } }
      }
    });

    for (const court of item.courts) {
      const existingCourt = await prisma.court.findFirst({
        where: { venueId: venue.id, name: court.name }
      });
      if (existingCourt) {
        await prisma.court.update({
          where: { id: existingCourt.id },
          data: court
        });
      } else {
        await prisma.court.create({
          data: { ...court, venueId: venue.id }
        });
      }
    }

    await prisma.review.upsert({
      where: { userId_venueId: { userId: customer.id, venueId: venue.id } },
      update: {},
      create: { userId: customer.id, venueId: venue.id, rating: 5, comment: "Booking cepat dan lapangannya bersih." }
    });
  }

  const futsalA = await prisma.court.findFirst({ where: { name: "Futsal A", venue: { slug: "arena-senayan" } } });
  const tennisA = await prisma.court.findFirst({ where: { name: "Tennis A", venue: { slug: "rally-house-bsd" } } });

  await prisma.unavailableSlot.deleteMany({
    where: {
      reason: { in: ["Maintenance demo", "Turnamen internal demo"] }
    }
  });

  if (futsalA) {
    await prisma.unavailableSlot.create({
      data: {
        courtId: futsalA.id,
        startsAt: jakartaDate(1, "18:00"),
        endsAt: jakartaDate(1, "20:00"),
        reason: "Maintenance demo"
      }
    });
  }

  if (tennisA) {
    await prisma.unavailableSlot.create({
      data: {
        courtId: tennisA.id,
        startsAt: jakartaDate(2, "19:00"),
        endsAt: jakartaDate(2, "21:00"),
        reason: "Turnamen internal demo"
      }
    });
  }
}

main()
  .finally(async () => prisma.$disconnect());
