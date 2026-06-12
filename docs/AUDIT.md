# Audit Repo & Checklist Deploy Vercel — CourtBook

Tanggal audit: 2026-06-12. Cakupan: security, CI/CD, database, backend, UI/UX, kesiapan deploy.

Stack: Next.js 15 (App Router) + React 19 + TypeScript + Prisma 5 + Supabase (PostgreSQL & Auth) + Midtrans Snap.

## Ringkasan

Arsitektur aplikasi sudah siap untuk deployment serverless di Vercel:

- Semua state persisten ada di Supabase PostgreSQL; tidak ada penulisan file lokal atau state in-memory yang dibutuhkan produksi (mock store hanya aktif jika `MOCK_DATA_FALLBACK=true`).
- Prisma client singleton + koneksi melalui PgBouncer pooler (`DATABASE_URL` port 6543) sudah benar untuk serverless; `DIRECT_URL` (port 5432) dipakai khusus migrasi.
- Pembuatan booking memakai transaksi dengan isolasi Serializable plus pengecekan overlap (`src/lib/db-data.ts`) — mencegah double-booking.
- Semua endpoint API memvalidasi input dengan Zod; query lewat Prisma (tidak ada raw SQL → tidak ada risiko SQL injection); tidak ada `dangerouslySetInnerHTML` (risiko XSS rendah).
- RBAC (CUSTOMER / VENUE_ADMIN / SUPER_ADMIN) dan filtering per-user diterapkan di booking & payment.
- Webhook Midtrans diverifikasi signature SHA-512 di server, dengan audit trail `PaymentWebhook`.
- Logging JSON terstruktur ke stdout dengan redaksi field sensitif; tersedia `/api/health`, `/api/ready`, `/api/metrics`.
- CI (`.github/workflows/ci.yml`): prisma validate, ESLint `--max-warnings=0`, typecheck, build, `npm audit --omit=dev --audit-level=high`.

## Temuan yang sudah diperbaiki (commit ini)

| # | Temuan | Lokasi | Perbaikan |
|---|--------|--------|-----------|
| 1 | Pipeline deploy tidak menjalankan migrasi — schema produksi tidak akan terbentuk/terupdate | `.github/workflows/deploy-vercel.yml` | Ditambah step `npx prisma migrate deploy` (butuh secrets `DATABASE_URL` & `DIRECT_URL`) sebelum deploy Vercel |
| 2 | Cookie demo-session `secure: false` — terkirim lewat HTTP | `src/app/api/auth/demo-login/route.ts` | `secure: process.env.NODE_ENV === "production"` |
| 3 | `verifyMidtransSignature` meloloskan webhook tanpa signature jika `MIDTRANS_SERVER_KEY` kosong dan gateway ≠ midtrans | `src/lib/payment.ts` | Tanpa server key, hanya lolos jika `PAYMENT_GATEWAY=mock` **dan** bukan production; selain itu ditolak |
| 4 | `local-dev.log` tidak di-ignore (berisiko ter-commit berisi data request) | `.gitignore` | Ditambahkan ke ignore list |

Catatan: `postinstall: prisma generate` (penting agar Prisma Client ter-generate di build Vercel) dan template `DEMO_AUTH_SECRET` di `.env.example` sudah ada sebelumnya — tidak perlu perubahan.

## Tindakan manual yang WAJIB dilakukan (tidak bisa dari kode)

### 1. Rotasi kredensial (High)

`.env` / `.env.local` lokal berisi kredensial asli (password DB Supabase, Midtrans server key, Supabase keys). File-file ini **tidak ter-track git** (sudah diverifikasi), tapi karena sudah tersebar di beberapa file lokal, rotasi adalah praktik aman:

- Supabase dashboard → Settings → Database → reset password, lalu perbarui `DATABASE_URL`/`DIRECT_URL`.
- Midtrans dashboard (sandbox) → Settings → Access Keys → regenerate server & client key.
- Perbarui `.env` lokal, GitHub Secrets, dan Vercel env vars dengan nilai baru.

### 2. GitHub Secrets (repo → Settings → Secrets and variables → Actions)

| Secret | Untuk |
|--------|-------|
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Workflow Deploy Vercel |
| `DATABASE_URL`, `DIRECT_URL` | Step `prisma migrate deploy` |
| `SONAR_TOKEN` (+ env lain di sonarcloud.yml) | SonarCloud |

### 3. Environment variables di Vercel (Production)

| Variabel | Nilai |
|----------|-------|
| `DATABASE_URL` | Supabase pooler, port 6543, `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase direct, port 5432 |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key |
| `NEXT_PUBLIC_APP_URL` | `https://<domain-vercel>` — **wajib**; dipakai untuk callback/finish URL Midtrans (fallback-nya `http://localhost:3000`) |
| `PAYMENT_GATEWAY` | `midtrans` |
| `MIDTRANS_IS_PRODUCTION` | `false` (sandbox) |
| `MIDTRANS_SERVER_KEY` | Server key sandbox |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Client key sandbox |
| `DEMO_AUTH_ENABLED` / `NEXT_PUBLIC_DEMO_AUTH_ENABLED` | `false` |
| `DEMO_PAYMENT_CONFIRM_ENABLED` / `NEXT_PUBLIC_DEMO_PAYMENT_CONFIRM_ENABLED` | `false` |
| `MOCK_DATA_FALLBACK` | `false` |
| `APP_ENV` | `production` |
| `LOG_LEVEL` | `info` |

### 4. Midtrans dashboard (sandbox)

Settings → Configuration → Payment Notification URL: `https://<domain>/api/payments/webhook`.

### 5. SonarCloud

`sonar-project.properties` masih berisi placeholder `replace-with-sonarcloud-organization` — ganti dengan organization key asli.

### 6. Seed data (opsional, sekali saja)

Setelah migrasi pertama sukses: `npm run prisma:seed` dengan env mengarah ke DB produksi (3 venue demo, 8 court, user demo).

## Urutan deploy

1. Selesaikan langkah manual 1–5 di atas.
2. Merge ke `main` (atau jalankan workflow "Deploy Vercel" via workflow_dispatch).
3. Workflow akan: install deps → `prisma migrate deploy` → `vercel --prod`.
4. Smoke test:
   - `GET https://<domain>/api/ready` → harus `ready: true` (cek DB, gateway, app URL).
   - Alur lengkap: register → pilih venue → pilih slot → buat booking → bayar via Midtrans sandbox (kartu test) → webhook mengubah status menjadi CONFIRMED → QR muncul di detail booking.

## Backlog (medium/low — belum dikerjakan)

### Security
- **Rate limiting** pada `/api/payments/*`, `/api/auth/*` (mis. Vercel WAF, Upstash Ratelimit, atau middleware) — saat ini tidak ada proteksi brute-force.
- **CSRF**: saat ini mengandalkan `sameSite: lax` + same-origin API; pertimbangkan token CSRF eksplisit jika ada form cross-site.
- Webhook 401 mengkonfirmasi keberadaan endpoint ke penyerang — pertimbangkan respons 200 silent-ignore di produksi.
- Naikkan `npm audit --audit-level=high` → `moderate` di `ci.yml`.
- Aktifkan security hotspots profile di SonarCloud.

### Database
- Tidak ada isu blocker. Pertimbangkan job terjadwal (Vercel Cron) untuk `expireStaleBookings()` agar booking kedaluwarsa dibersihkan tanpa menunggu request availability.

### UI/UX
- Loading state hanya teks ("Memuat...", "Memproses...") — tambah skeleton/spinner.
- Atribut ARIA minim (tidak ada `aria-label`/`aria-live` untuk status dinamis).
- Validasi form client-side hanya `required`/`type` — error baru tampil setelah submit.
- Form login pre-fill kredensial demo (`src/app/login/page.tsx`) — membingungkan jika demo auth nonaktif di produksi.

### Infra
- Tidak ada Dockerfile — tidak dibutuhkan untuk Vercel, perlu dibuat jika pindah ke container.
- Tidak ada automated test (unit/e2e) — CI hanya lint/typecheck/build; tambah minimal test untuk logika availability & status transition payment.
