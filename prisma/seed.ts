import { PrismaClient, SportType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@courtbook.test" },
    update: {},
    create: {
      name: "Admin CourtBook",
      email: "admin@courtbook.test",
      phone: "+6281200000000",
      passwordHash: "replace-with-bcrypt-hash",
      role: UserRole.VENUE_ADMIN
    }
  });

  const customer = await prisma.user.upsert({
    where: { email: "user@courtbook.test" },
    update: {},
    create: {
      name: "Customer Demo",
      email: "user@courtbook.test",
      phone: "+6281300000000",
      passwordHash: "replace-with-bcrypt-hash",
      role: UserRole.CUSTOMER
    }
  });

  const venue = await prisma.venue.upsert({
    where: { slug: "arena-senayan" },
    update: {},
    create: {
      name: "Arena Senayan",
      slug: "arena-senayan",
      description: "Kompleks olahraga indoor dengan akses mudah dan fasilitas lengkap.",
      city: "Jakarta",
      address: "Jl. Pintu Satu Senayan, Jakarta Pusat",
      facilities: ["Parkir", "Ruang ganti", "Mushola", "Kantin", "Shower"],
      rules: ["Datang 15 menit sebelum jadwal", "Sepatu non-marking untuk indoor", "Pembatalan mengikuti kebijakan venue"],
      photos: [
        "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=80"
      ],
      opensAt: "06:00",
      closesAt: "23:00",
      cancellationPolicy: "Refund 75% untuk pembatalan minimal 24 jam sebelum jadwal.",
      admins: { connect: { id: admin.id } },
      courts: {
        create: [
          { name: "Futsal A", sportType: SportType.FUTSAL, surface: "Vinyl", pricePerHour: 250000 },
          { name: "Badminton 1", sportType: SportType.BADMINTON, surface: "Karpet", pricePerHour: 90000 },
          { name: "Basket Main", sportType: SportType.BASKET, surface: "Parquet", pricePerHour: 300000 }
        ]
      }
    }
  });

  await prisma.review.upsert({
    where: { userId_venueId: { userId: customer.id, venueId: venue.id } },
    update: {},
    create: { userId: customer.id, venueId: venue.id, rating: 5, comment: "Booking cepat dan lapangannya bersih." }
  });
}

main()
  .finally(async () => prisma.$disconnect());
