import { PrismaClient, SportType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const venueSeeds = [
  {
    name: "Arena Senayan",
    slug: "arena-senayan",
    description: "Kompleks olahraga indoor premium dengan akses MRT, parkir luas, dan pilihan lapangan populer untuk komunitas.",
    city: "Jakarta",
    address: "Gelora, Jakarta Pusat",
    facilities: ["Parkir", "Ruang ganti", "Shower", "Mushola", "Kantin", "Wi-Fi"],
    rules: ["Check-in maksimal 15 menit sebelum jadwal", "Gunakan sepatu olahraga sesuai permukaan", "Refund mengikuti kebijakan venue"],
    photos: ["https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=80"],
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
    photos: ["https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80"],
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
    photos: ["https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80"],
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

    await prisma.court.deleteMany({ where: { venueId: venue.id } });
    await prisma.court.createMany({
      data: item.courts.map((court) => ({ ...court, venueId: venue.id }))
    });

    await prisma.review.upsert({
      where: { userId_venueId: { userId: customer.id, venueId: venue.id } },
      update: {},
      create: { userId: customer.id, venueId: venue.id, rating: 5, comment: "Booking cepat dan lapangannya bersih." }
    });
  }
}

main()
  .finally(async () => prisma.$disconnect());
