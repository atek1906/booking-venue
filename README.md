# CourtBook

CourtBook adalah aplikasi web booking lapangan olahraga untuk mencari venue, memilih slot, checkout, membayar online, dan menerima bukti booking berbasis QR code.

## Stack

- Frontend: Next.js App Router, React, TypeScript
- Backend: Next.js API routes
- Database schema: Supabase PostgreSQL + Prisma
- Auth: Supabase Auth
- Payment gateway: Midtrans Snap + QRIS, dengan mock payment flow sebagai fallback non-production
- QR booking: `qrcode.react`
- Quality scan: SonarCloud

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

3. Isi `.env.local`:

```text
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
PAYMENT_GATEWAY=midtrans
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
SONAR_TOKEN=
```

4. Generate Prisma client dan seed Supabase:

```bash
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
```

5. Jalankan app:

```bash
npm run dev
```

6. Buka:

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

Runtime API menggunakan Prisma ke Supabase Postgres. Pastikan Supabase Auth sudah mengizinkan email/password login dan user admin dibuat melalui seed/Supabase dashboard, bukan melalui form customer.

## Payment Gateway

Mode production/staging memakai:

```text
PAYMENT_GATEWAY=midtrans
```

Flow Midtrans:

1. Pilih venue dan lapangan.
2. Pilih tanggal, jam mulai, dan durasi.
3. Pilih metode `Midtrans Snap` atau `QRIS in-app`.
4. Backend membuat booking pending dan payment pending.
5. Snap menampilkan link pembayaran Midtrans; QRIS menampilkan QR pembayaran.
6. Webhook Midtrans mengubah status menjadi paid/confirmed.
7. QR bukti booking aktif setelah pembayaran berhasil.

Endpoint webhook:

```text
POST /api/payments/webhook
```

Backend memverifikasi signature Midtrans sebelum mengubah payment/booking status. Jangan mengubah status pembayaran dari frontend.

## SonarCloud

Isi `sonar.organization` dan `sonar.projectKey` di `sonar-project.properties`, lalu jalankan:

```bash
npm run sonar
```

Pastikan `SONAR_TOKEN` tersedia di environment lokal dan GitHub Actions secrets.

## Deploy Vercel

1. Tambahkan semua env dari `.env.example` ke Vercel Project Settings.
2. Gunakan Supabase pooled connection untuk `DATABASE_URL` dan direct connection untuk `DIRECT_URL`.
3. Jalankan migration dan seed dari lokal/CI sebelum deploy production.
4. Set Midtrans webhook ke:

```text
https://<domain-vercel>/api/payments/webhook
```

5. Pastikan SonarCloud quality gate lulus sebelum promote production.
