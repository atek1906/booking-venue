# CourtBook

CourtBook adalah aplikasi web booking lapangan olahraga untuk mencari venue, memilih slot, checkout, membayar online, dan menerima bukti booking berbasis QR code.

## Stack

- Frontend: Next.js App Router, React, TypeScript
- Backend: Next.js API routes
- Database schema: PostgreSQL + Prisma
- Payment gateway: Midtrans-ready, dengan mock payment flow sebagai default
- QR booking: `qrcode.react`

## Struktur Project

```text
prisma/
  schema.prisma        # schema database utama
  seed.ts              # seed venue, court, user, review
src/
  app/                 # halaman dan API route Next.js
  app/api/bookings     # create/list/detail booking + lock slot
  app/api/payments     # create payment, mock simulate, webhook
  app/admin            # dashboard dan manajemen admin venue
  components           # komponen UI reusable
  lib                  # mock data, booking rules, payment helpers
```

## Fitur Yang Sudah Disiapkan

- Landing/home dengan pencarian lapangan
- Daftar venue dan filter olahraga/lokasi/harga
- Detail venue, foto, fasilitas, jam operasional, harga, dan aturan
- Pilih jadwal booking, durasi, checkout, dan lock slot 15 menit
- API booking dengan validasi overlap untuk mencegah double booking
- Payment create endpoint dan mock payment simulator
- Webhook Midtrans endpoint dengan verifikasi signature
- Status pembayaran: pending, paid, failed, expired, refunded
- Riwayat booking dan detail booking dengan QR code setelah paid
- Dashboard admin, manajemen venue/lapangan/jadwal/booking/laporan
- Prisma schema untuk `users`, `venues`, `courts`, `court_schedules`, `bookings`, `payments`, `payment_webhooks`, `unavailable_slots`, `reviews`

## Cara Menjalankan

1. Install dependency:

```bash
npm install
```

2. Salin environment:

```bash
cp .env.example .env
```

3. Untuk mode demo tanpa database/payment key, jalankan langsung:

```bash
npm run dev
```

4. Buka:

```text
http://localhost:3000
```

## Menjalankan Prisma

Pastikan PostgreSQL tersedia dan `DATABASE_URL` di `.env` sudah benar, lalu:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Mode UI/API saat ini menggunakan mock store agar payment flow bisa dicoba tanpa database. Schema Prisma sudah siap menjadi sumber data permanen untuk tahap berikutnya.

## Payment Gateway

Default `.env` memakai:

```text
PAYMENT_GATEWAY=mock
```

Flow mock:

1. Pilih venue dan lapangan.
2. Pilih tanggal, jam mulai, dan durasi.
3. Klik `Bayar Sekarang`.
4. Backend membuat booking pending dan payment pending.
5. Halaman status menampilkan tombol `Simulasi Paid`, `Simulasi Expired`, dan `Simulasi Failed`.
6. Jika paid, booking berubah menjadi confirmed dan QR booking aktif.

Untuk Midtrans, isi:

```text
PAYMENT_GATEWAY=midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
```

Endpoint webhook:

```text
POST /api/payments/webhook
```

Backend memverifikasi signature Midtrans sebelum mengubah payment/booking status. Jangan mengubah status pembayaran dari frontend.
