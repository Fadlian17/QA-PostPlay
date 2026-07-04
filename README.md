# Postplay Automation

README ini menjelaskan setup, struktur, dan cara menjalankan test untuk project Postplay.

## Struktur proyek saat ini

- `package.json` — skrip npm dan dependency.
- `playwright.config.ts` — konfigurasi Playwright lengkap.
- `tsconfig.json` — konfigurasi TypeScript.
- `.env` — environment variables lokal.
- `postman.config.cjs` — konfigurasi Postman integration.
- `fixtures/base.ts` — fixture Playwright dengan network capture Postman.
- `helpers/auth.ts` — helper autentikasi API.
- `tests/ui/` — UI test file, termasuk auth, permissions, dan dashboard.
- `tests/api/` — API contract test file.

## Tools & dependensi utama

Project ini menggunakan:

- `node` (>=18.x)
- `npm` (>=9.x)
- `@playwright/test`
- `typescript`
- `dotenv`
- `postman-playwright`

> Jika ingin menggunakan Postman CLI, install secara global:
>
> ```bash
> npm install -g postman-cli
> ```

## Setup awal

1. Pastikan Node.js dan npm sudah terpasang.
2. Install dependency project:

```bash
npm install
```

3. Salin file environment jika diperlukan:

```bash
cp .env .env.local
```

4. Jika belum ada Postman CLI, install manual:

```bash
npm install -g postman-cli
```

## Environment variables

File `.env` yang sudah ada berisi contoh konfigurasi:

```env
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!
POSTMAN_API_KEY=your_postman_api_key_here
```

Sesuaikan nilai di atas untuk environment lokal atau CI.

## Skrip npm yang tersedia

Gunakan perintah berikut dari root project:

- `npm test`
  - Jalankan semua test Playwright.
- `npm run test:ui`
  - Jalankan semua UI test di `tests/ui/`.
- `npm run test:api`
  - Jalankan semua API contract test di `tests/api/`.
- `npm run test:headed`
  - Jalankan test Playwright dalam mode headed.
- `npm run test:debug`
  - Jalankan test Playwright dalam mode debug.
- `npm run report`
  - Buka HTML report Playwright terakhir.
- `npm run postman:init`
  - Mulai inisialisasi Postman app untuk menghubungkan workspace.
- `npm run postman:validate`
  - Jalankan validasi Postman integration dengan command `npx playwright test`.

## Menjalankan test

### 1. Jalankan semua test

```bash
npm test
```

### 2. Jalankan hanya UI test

```bash
npm run test:ui
```

### 3. Jalankan hanya API test

```bash
npm run test:api
```

### 4. Jalankan mode headed

```bash
npm run test:headed
```

### 5. Debug test Playwright

```bash
npm run test:debug
```

### 6. Buka laporan Playwright

```bash
npm run report
```

## Playwright konfigurasi penting

File `playwright.config.ts` sudah dikonfigurasi dengan:

- `baseURL` dari `process.env.BASE_URL`
- timeout 60 detik
- retries hanya di CI
- reporter HTML, JSON, list
- `trace` dan `video` untuk debug
- web server dev otomatis saat dibutuhkan

## Test file utama

### `tests/ui/auth.spec.ts`
- Memverifikasi halaman login tersedia.

### `tests/ui/permissions.spec.ts`
- Menjalankan skenario manajemen permission.
- Menggunakan helper `loginViaAPI` dan `setAuthState` untuk autentikasi.

### `tests/ui/dashboard.spec.ts`
- Membuat data via API lalu memverifikasi muncul di dashboard.

### `tests/api/users.spec.ts`
- Memvalidasi contract API `/api/users`.
- Memeriksa schema response, status code, dan error handling.

### `tests/api/contract.spec.ts`
- Memastikan `API_BASE_URL` tersedia.
- Memeriksa endpoint health check.

## Konfigurasi Postman

File `postman.config.cjs` berisi target environment dan filter URL untuk validasi API.

Jika ingin menghubungkan Postman workspace, jalankan:

```bash
npm run postman:init
```

## Troubleshooting

### Jika test gagal karena environment
- Pastikan `.env` sudah benar.
- Pastikan `BASE_URL` dan `API_BASE_URL` aktif.
- Pastikan user test valid dan tidak kadaluarsa.

### Jika Playwright tidak menemukan test
- Pastikan file berada di `tests/ui/` atau `tests/api/`.
- Pastikan ekstensi `.ts` didukung oleh `tsconfig.json`.

### Jika Postman CLI tidak terpasang
- Install global `postman-cli`:

```bash
npm install -g postman-cli
```

## Rekomendasi pengembangan berikutnya

- Tambahkan `eslint` dan `prettier` untuk linting dan format.
- Tambahkan workflow GitHub Actions untuk CI.
- Tambahkan validasi Postman full integration di CI.
- Perkuat assertions API dengan schema validation tambahan.

## Kontak

Untuk pengembangan lebih lanjut, gunakan file `helpers/auth.ts` dan `fixtures/base.ts` sebagai titik awal integrasi API + UI.
