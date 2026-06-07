# CourtBook

CourtBook adalah aplikasi web booking lapangan olahraga untuk mencari venue, memilih slot, checkout, membayar online, dan menerima bukti booking berbasis QR code.

## Stack

- Frontend: Next.js App Router, React, TypeScript
- Backend: Next.js API routes
- Database schema: Supabase PostgreSQL + Prisma
- Auth: Supabase Auth
- Payment gateway: Midtrans Snap, dengan mock payment flow sebagai fallback non-production
- QR booking: `qrcode.react`
- Observability: structured JSON logging, request id, health/readiness/metrics endpoints
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
- Galeri foto venue dan harga per jam per lapangan
- Availability board 7 hari ke depan untuk melihat slot available/booked/unavailable
- Pilih jadwal booking, durasi, checkout, dan lock slot 15 menit
- API booking dengan validasi overlap untuk mencegah double booking
- Payment create endpoint, Midtrans sandbox, dan konfirmasi lokal dev-only
- Webhook Midtrans endpoint dengan verifikasi signature
- Idempotent payment create untuk mencegah order Midtrans duplikat pada klik bayar berulang
- Status pembayaran: pending, paid, failed, expired, refunded
- Health/readiness/metrics endpoint untuk monitoring uptime, database, dan konfigurasi gateway
- GitHub Actions CI untuk Prisma validate, lint, typecheck, build, dan dependency audit
- Workflow deploy Vercel berbasis secret production
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
APP_ENV=local
LOG_SERVICE_NAME=courtbook
LOG_LEVEL=info
MOCK_DATA_FALLBACK=false
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
PAYMENT_GATEWAY=midtrans
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_TIMEOUT_MS=10000
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

## Demo Lokal End-to-End

Untuk mencoba user story lokal tanpa membuat user Supabase Auth, aktifkan demo auth dan dev payment confirmation di `.env.local`:

```text
DEMO_AUTH_ENABLED=true
NEXT_PUBLIC_DEMO_AUTH_ENABLED=true
DEMO_USER_EMAIL=user@courtbook.test
DEMO_USER_PASSWORD=password
DEMO_AUTH_SECRET=isi-secret-lokal-panjang
DEMO_PAYMENT_CONFIRM_ENABLED=true
NEXT_PUBLIC_DEMO_PAYMENT_CONFIRM_ENABLED=true
PAYMENT_GATEWAY=midtrans
MIDTRANS_IS_PRODUCTION=false
```

Flow lokal:

1. Jalankan migration/seed agar venue, court, foto, dan blocked demo slot tersedia.
2. Login di `/login` dengan `user@courtbook.test` / `password`.
3. Buka `/venues`, pilih venue, lihat galeri dan harga per jam.
4. Klik `Cek Availability`, pilih slot available di board 7 hari.
5. Klik bayar agar aplikasi langsung membuka Midtrans Snap sandbox.
6. Karena localhost tidak bisa menerima webhook Midtrans tanpa tunnel, gunakan tombol `Confirm Paid Lokal` yang hanya muncul saat flag dev aktif.
7. Buka `/bookings` atau detail booking untuk melihat status confirmed dan QR booking.

Jangan aktifkan flag `DEMO_*` di production.

## Payment Gateway

Mode production/staging memakai:

```text
PAYMENT_GATEWAY=midtrans
```

Flow Midtrans:

1. Pilih venue dan lapangan.
2. Pilih tanggal, jam mulai, dan durasi.
3. Aplikasi membuat transaksi dan membuka Midtrans Snap.
4. Backend membuat booking pending dan payment pending.
5. Snap menampilkan pilihan metode pembayaran yang aktif di akun Midtrans.
6. Webhook Midtrans mengubah status menjadi paid/confirmed.
7. QR bukti booking aktif setelah pembayaran berhasil.

Untuk sandbox localhost, gunakan `Confirm Paid Lokal` setelah mencoba Snap karena webhook Midtrans tidak bisa mencapai localhost tanpa tunnel. Tombol ini tidak aktif di production.

Endpoint webhook:

```text
POST /api/payments/webhook
```

Backend memverifikasi signature Midtrans sebelum mengubah payment/booking status. Jangan mengubah status pembayaran dari frontend.

Midtrans production checklist:

1. Set `PAYMENT_GATEWAY=midtrans`, `MIDTRANS_IS_PRODUCTION=true`, `MIDTRANS_SERVER_KEY`, dan `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`.
2. Set `NEXT_PUBLIC_APP_URL` ke domain publik.
3. Daftarkan notification/webhook URL di dashboard Midtrans ke `/api/payments/webhook`.
4. Pastikan endpoint publik mendukung HTTPS dan merespons webhook dengan cepat.
5. Gunakan `/api/ready` untuk memastikan database dan konfigurasi gateway siap sebelum promote.

## Logging & Monitoring

Semua route payment dan booking penting mengirim log JSON terstruktur dengan `requestId`, route, path, status, dan metadata aman. Field sensitif seperti token, signature, secret, cookie, dan password otomatis direduksi.

Endpoint operasional:

```text
GET /api/health   # liveness ringan
GET /api/ready    # readiness: database + konfigurasi gateway
GET /api/metrics  # Prometheus text format sederhana
```

Set `LOG_SERVICE_NAME`, `APP_ENV`, dan `LOG_LEVEL=debug` bila perlu detail lebih banyak di staging.

Untuk preview lokal saat database Supabase tidak dapat dijangkau, set `MOCK_DATA_FALLBACK=true`. Flag ini hanya mengganti data venue/availability untuk halaman publik, bukan mengganti flow booking/payment production.

## CI/CD

Workflow utama:

```text
.github/workflows/ci.yml             # PR/push gate: prisma validate, lint, typecheck, build, audit
.github/workflows/sonarcloud.yml     # quality scan SonarCloud
.github/workflows/deploy-vercel.yml  # production deploy ke Vercel
```

Secrets untuk deploy Vercel:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

CI memakai env placeholder yang aman karena build Next.js tidak perlu koneksi database production.

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
4. Set `NEXT_PUBLIC_APP_URL` ke domain Vercel production, misalnya `https://courtbook.example.com`.
5. Pastikan `DEMO_AUTH_ENABLED=false`, `NEXT_PUBLIC_DEMO_AUTH_ENABLED=false`, `DEMO_PAYMENT_CONFIRM_ENABLED=false`, dan `NEXT_PUBLIC_DEMO_PAYMENT_CONFIRM_ENABLED=false`.
6. Set Midtrans webhook ke:

```text
https://<domain-vercel>/api/payments/webhook
```

7. Pastikan SonarCloud quality gate lulus sebelum promote production.
