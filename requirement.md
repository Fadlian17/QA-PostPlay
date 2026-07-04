# Postman + Playwright Integration Testing
> Dokumentasi lengkap untuk membangun sistem testing UI dan API secara bersamaan.  
> Dibuat berdasarkan: https://blog.postman.com/postman-playwright-integration-testing-ui-and-api-together/

---

## 1. Overview & Tujuan

Integrasi ini menggabungkan dua pendekatan testing dalam satu pipeline:
- **Playwright** → menjalankan UI test dan secara otomatis menangkap seluruh network traffic
- **Postman CLI** → memvalidasi API contract dari traffic yang ditangkap Playwright secara real-time

Masalah yang diselesaikan:
- UI test hijau, tapi API layer di bawahnya diam-diam broken
- Endpoint tidak terdokumentasi yang dipanggil frontend
- Schema drift antara API spec dan payload aktual

---

## 2. Requirements

### 2.1 Tools & Versi

| Tool | Versi Minimum | Keterangan |
|---|---|---|
| Node.js | >= 18.x | Runtime utama |
| npm | >= 9.x | Package manager |
| Postman CLI | latest | `postman-cli` global |
| `@playwright/test` | >= 1.44.0 | Test runner UI |
| `postman-playwright` | latest | Plugin integrasi |
| TypeScript | >= 5.x | Opsional tapi direkomendasikan |

### 2.2 Akun & Akses

- [ ] Akun Postman aktif (free tier cukup untuk dev)
- [ ] Workspace Postman sudah dibuat dan terhubung ke repository via Postman's native Git integration
- [ ] Collection API sudah ada di workspace Postman
- [ ] Environment di Postman sudah dikonfigurasi (Local, Staging, Production)
- [ ] Postman API Key tersimpan sebagai environment variable

### 2.3 Struktur Proyek yang Diharapkan

```
my-project/
├── tests/
│   ├── ui/
│   │   ├── auth.spec.ts
│   │   ├── permissions.spec.ts
│   │   └── dashboard.spec.ts
│   └── api/
│       ├── users.spec.ts
│       └── contract.spec.ts
├── fixtures/
│   └── base.ts
├── helpers/
│   └── auth.ts
├── postman.config.cjs
├── playwright.config.ts
├── tsconfig.json
├── .env
└── package.json
```

---

## 3. Setup & Instalasi

### 3.1 Install Dependencies

```bash
# Install Postman CLI secara global
npm install -g postman-cli

# Install plugin di project
npm install -D postman-playwright @playwright/test typescript

# Install browser Playwright (pilih sesuai kebutuhan)
npx playwright install chromium
```

### 3.2 Konfigurasi Playwright (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'results.json' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### 3.3 Konfigurasi Postman (`postman.config.cjs`)

```javascript
// postman.config.cjs
// File ini di-generate oleh: postman app init
// Commit file ini ke repository

module.exports = {
  command: 'npx playwright test',
  targets: {
    default: {
      environment: 'Local',
      collections: ['User Permissions API', 'Auth API'],
    },
    staging: {
      environment: 'Staging',
      collections: ['User Permissions API', 'Auth API'],
    },
    production: {
      environment: 'Production',
      collections: ['User Permissions API', 'Auth API'],
    },
  },
  filters: {
    // URL yang ingin divalidasi (whitelist)
    urlPatterns: [
      'localhost:3000/api',
      'api.myapp.com',
    ],
    // URL yang diabaikan (third-party)
    excludePatterns: [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'analytics.google.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    headers: {},
  },
};
```

### 3.4 Inisialisasi Postman App

```bash
# Jalankan sekali saja untuk menghubungkan project ke Postman workspace
postman app init

# Ikuti prompt:
# - Pilih workspace
# - Pilih collection yang relevan
# - Pilih environment (Local)
# - Tentukan command untuk menjalankan UI
```

### 3.5 Setup Fixture (`fixtures/base.ts`)

```typescript
import { test as baseTest, expect } from '@playwright/test';
import { attachNetworkCapture } from 'postman-playwright';

// Attach network capture ke test fixture
// INI WAJIB — tanpa ini Postman tidak menangkap traffic
const test = attachNetworkCapture(baseTest);

export { test, expect };
```

### 3.6 Helper Autentikasi (`helpers/auth.ts`)

```typescript
import { APIRequestContext, BrowserContext } from '@playwright/test';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login via API dan kembalikan token
 * Lebih cepat daripada login melalui UI form
 */
export async function loginViaAPI(
  request: APIRequestContext,
  credentials: { email: string; password: string }
): Promise<AuthTokens> {
  const response = await request.post('/api/auth/login', {
    data: credentials,
  });

  if (!response.ok()) {
    throw new Error(`Login gagal: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Set auth state ke browser context
 * Sehingga UI test tidak perlu login ulang
 */
export async function setAuthState(
  context: BrowserContext,
  tokens: AuthTokens
): Promise<void> {
  await context.addCookies([
    {
      name: 'access_token',
      value: tokens.accessToken,
      domain: 'localhost',
      path: '/',
    },
  ]);

  await context.addInitScript((token) => {
    localStorage.setItem('access_token', token);
  }, tokens.accessToken);
}
```

### 3.7 Variabel Environment (`.env`)

```bash
# .env — JANGAN dicommit ke Git, tambahkan ke .gitignore

# URL aplikasi
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001

# Kredensial test (gunakan akun khusus testing)
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!

# Postman
POSTMAN_API_KEY=your_postman_api_key_here

# CI flag (otomatis di-set oleh GitHub Actions)
# CI=true
```

### 3.8 Scripts `package.json`

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --project=chromium tests/ui/",
    "test:api": "playwright test tests/api/",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:ci": "CI=true postman app test",
    "test:staging": "CI=true postman app test --target staging",
    "test:capture": "postman app test --capture-only",
    "report": "playwright show-report",
    "postman:init": "postman app init",
    "postman:validate": "postman app test --command 'npx playwright test'"
  }
}
```

---

## 4. Contoh Kode Test

### 4.1 UI Test dengan Network Capture (`tests/ui/permissions.spec.ts`)

```typescript
import { test, expect } from '../../fixtures/base';
import { loginViaAPI, setAuthState } from '../../helpers/auth';

test.describe('User Permissions Management', () => {
  
  // Setup: login via API sebelum semua test di suite ini
  test.beforeEach(async ({ request, context }) => {
    const tokens = await loginViaAPI(request, {
      email: process.env.TEST_ADMIN_EMAIL!,
      password: process.env.TEST_ADMIN_PASSWORD!,
    });
    await setAuthState(context, tokens);
  });

  test('admin dapat membuat permission baru', async ({ page }) => {
    await page.goto('/permissions');
    
    // Pastikan halaman sudah load
    await expect(page.getByRole('heading', { name: 'User Permissions' })).toBeVisible();
    
    // Klik tombol tambah permission
    await page.getByRole('button', { name: 'Add Permission' }).click();
    
    // Isi form
    await page.getByLabel('Permission Name').fill('view:reports');
    await page.getByLabel('Description').fill('Can view all reports');
    await page.getByRole('combobox', { name: 'Category' }).selectOption('read');
    
    // Submit
    await page.getByRole('button', { name: 'Save' }).click();
    
    // Validasi UI berhasil
    await expect(page.getByText('Permission created successfully')).toBeVisible();
    await expect(page.getByText('view:reports')).toBeVisible();
    
    // CATATAN: Postman secara otomatis menangkap dan memvalidasi
    // API call POST /api/permissions yang terjadi saat Save diklik
  });

  test('admin dapat menghapus permission', async ({ page }) => {
    await page.goto('/permissions');
    
    // Cari permission yang akan dihapus
    const row = page.getByRole('row', { name: /view:reports/ });
    await expect(row).toBeVisible();
    
    // Klik delete
    await row.getByRole('button', { name: 'Delete' }).click();
    
    // Konfirmasi dialog
    await page.getByRole('button', { name: 'Confirm Delete' }).click();
    
    // Validasi UI
    await expect(page.getByText('Permission deleted')).toBeVisible();
    await expect(page.getByText('view:reports')).not.toBeVisible();
    
    // Postman memvalidasi DELETE /api/permissions/:id
  });

  test('menampilkan error jika permission duplikat', async ({ page }) => {
    await page.goto('/permissions');
    await page.getByRole('button', { name: 'Add Permission' }).click();
    
    // Coba buat permission yang sudah ada
    await page.getByLabel('Permission Name').fill('admin:read'); // sudah ada
    await page.getByRole('button', { name: 'Save' }).click();
    
    // UI harus menampilkan error
    await expect(page.getByText('Permission already exists')).toBeVisible();
    
    // Postman memastikan API mengembalikan 409 Conflict dengan schema yang benar
  });
});
```

### 4.2 Hybrid Test — API Setup, UI Verify (`tests/ui/dashboard.spec.ts`)

```typescript
import { test, expect } from '../../fixtures/base';
import { loginViaAPI, setAuthState } from '../../helpers/auth';

test('dashboard menampilkan data sesuai API response', async ({ page, request, context }) => {
  // Step 1: Setup data via API (lebih cepat dari UI)
  const tokens = await loginViaAPI(request, {
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  });
  await setAuthState(context, tokens);

  // Step 2: Buat test data via API
  const createResponse = await request.post('/api/users', {
    data: {
      name: 'Test User Automation',
      email: 'automation@test.com',
      role: 'viewer',
    },
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const { id: userId } = await createResponse.json();

  // Step 3: Verifikasi data muncul di UI
  await page.goto('/dashboard/users');
  
  const userRow = page.getByRole('row', { name: /automation@test.com/ });
  await expect(userRow).toBeVisible();
  await expect(userRow.getByText('viewer')).toBeVisible();

  // Step 4: Cleanup via API
  await request.delete(`/api/users/${userId}`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
});
```

### 4.3 Pure API Contract Test (`tests/api/users.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Users API Contract', () => {
  let baseURL: string;
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    baseURL = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const loginRes = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      },
    });
    const { accessToken } = await loginRes.json();
    authToken = accessToken;
  });

  test('GET /api/users - mengembalikan list users dengan schema yang benar', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    
    // Validasi struktur response
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.data)).toBeTruthy();
    
    if (body.data.length > 0) {
      const user = body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('createdAt');
      
      // Validasi tipe data
      expect(typeof user.id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(['admin', 'editor', 'viewer']).toContain(user.role);
    }

    // Validasi header
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('POST /api/users - menolak data tidak valid', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/users`, {
      data: { email: 'not-an-email', role: 'invalid-role' },
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(422);
    
    const body = await response.json();
    expect(body).toHaveProperty('errors');
    expect(Array.isArray(body.errors)).toBeTruthy();
  });

  test('GET /api/users/:id - mengembalikan 404 untuk ID tidak dikenal', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/users/non-existent-id-12345`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(404);
    
    const body = await response.json();
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('code');
  });
});
```

---

## 5. Menjalankan Test

### 5.1 Development (tanpa validasi Postman)

```bash
# Jalankan semua test
npm test

# Jalankan hanya UI test
npm run test:ui

# Jalankan hanya API test
npm run test:api

# Mode headed (lihat browser)
npm run test:headed

# Mode debug (step by step)
npm run test:debug
```

### 5.2 Dengan Validasi Postman (mode integrasi penuh)

```bash
# Mode lokal — validasi contract + tampilkan hasil
postman app test

# Mode CI — push hasil ke Postman Application Inventory
CI=true postman app test

# Hanya capture traffic (tidak validasi — untuk setup awal collection)
postman app test --capture-only

# Target environment spesifik
CI=true postman app test --target staging
```

---

## 6. Code Review Checklist

### 6.1 Struktur Test

- [ ] Setiap test hanya menguji satu skenario (single responsibility)
- [ ] Nama test mendeskripsikan *behavior* bukan *implementasi* (`membuat permission baru` bukan `klik tombol add lalu isi form`)
- [ ] Tidak ada hardcoded data yang berubah (gunakan fixtures atau env variables)
- [ ] Setup (`beforeEach`/`beforeAll`) tidak mengandung assertion
- [ ] Cleanup data test dilakukan setelah test selesai (teardown)

### 6.2 Penggunaan Postman Plugin

- [ ] `attachNetworkCapture(baseTest)` digunakan di fixture, bukan di setiap test file
- [ ] `postman.config.cjs` sudah dicommit ke repository
- [ ] `urlPatterns` di config hanya mencakup API endpoint yang relevan
- [ ] Third-party URL (analytics, fonts, CDN) dimasukkan ke `excludePatterns`

### 6.3 Autentikasi

- [ ] Login dilakukan via API (`loginViaAPI`), bukan melalui UI form di setiap test
- [ ] Token disimpan di context, tidak di variabel global
- [ ] Kredensial menggunakan environment variables, tidak hardcoded
- [ ] Auth state di-reset antar test suite jika diperlukan

### 6.4 Selector & Locator

- [ ] Menggunakan role-based locator: `getByRole`, `getByLabel`, `getByText`
- [ ] Tidak menggunakan CSS selector yang rapuh (`.btn-primary > span`)
- [ ] Tidak menggunakan XPath kecuali tidak ada alternatif
- [ ] `data-testid` digunakan sebagai last resort, bukan default

### 6.5 Assertions

- [ ] Setiap test memiliki minimal satu assertion yang bermakna
- [ ] Tidak menggunakan `page.waitForTimeout()` — gunakan `expect().toBeVisible()`
- [ ] API response divalidasi status code DAN struktur body
- [ ] Error state diuji, bukan hanya happy path

### 6.6 Performa & Keandalan

- [ ] Test berjalan independen (tidak bergantung urutan eksekusi)
- [ ] Test tidak bergantung pada data yang dibuat test lain
- [ ] Timeout di-set per test jika test membutuhkan waktu lebih lama
- [ ] Retry dikonfigurasi hanya untuk CI, bukan development lokal

---

## 7. Maintenance

### 7.1 Update Dependencies (bulanan)

```bash
# Cek versi terbaru
npx npm-check-updates --filter "playwright,postman"

# Update
npm update @playwright/test postman-playwright

# Update browser binaries setelah update Playwright
npx playwright install
```

### 7.2 Sinkronisasi Postman Collection

Lakukan setiap kali ada perubahan API:

```bash
# Capture traffic terbaru dari test yang berjalan
postman app test --capture-only

# Review hasil capture di Postman Application Inventory
# Tambahkan endpoint baru ke collection
# Update assertion jika schema berubah
```

### 7.3 CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/integration-test.yml
name: Integration Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Install Postman CLI
        run: npm install -g postman-cli
      
      - name: Start application
        run: npm run dev &
        env:
          NODE_ENV: test
      
      - name: Wait for app to be ready
        run: npx wait-on http://localhost:3000 --timeout 60000
      
      - name: Run integration tests (Playwright + Postman)
        run: CI=true postman app test
        env:
          POSTMAN_API_KEY: ${{ secrets.POSTMAN_API_KEY }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
          BASE_URL: http://localhost:3000
      
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
      
      - name: Upload test results JSON
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: results.json
          retention-days: 7
```

### 7.4 Monitoring & Alerting

- Postman Application Inventory secara otomatis menyimpan riwayat hasil test setiap CI run
- Set Postman Monitor untuk menjalankan collection secara berkala (setiap 1 jam / 1 hari)
- Aktifkan notifikasi Postman ke Slack/email jika collection gagal
- Review Postman Application Inventory setiap sprint untuk deteksi contract drift

### 7.5 Rotasi Kredensial Test

```bash
# Setiap 90 hari, rotate test credentials
# 1. Buat akun test baru di environment staging/production
# 2. Update secrets di GitHub repository
# 3. Update .env.example
# 4. Notify tim

# Perintah untuk verifikasi credentials masih valid:
node -e "
const { request } = require('@playwright/test');
// ... verifikasi login
"
```

---

## 8. Report & Output

### 8.1 Playwright HTML Report

Setelah test selesai:

```bash
# Buka report di browser
npm run report

# Report berada di: playwright-report/index.html
```

Report mencakup:
- Status tiap test (passed / failed / skipped)
- Screenshot saat gagal
- Video recording (jika dikonfigurasi)
- Trace viewer untuk debugging step-by-step
- Timeline network requests

### 8.2 Postman Application Inventory

Setelah `CI=true postman app test` dijalankan:

1. Buka Postman → Application Inventory
2. Pilih aplikasi yang terhubung
3. Review tab berikut:

| Tab | Isi |
|---|---|
| Overview | Summary pass/fail per CI run |
| API Coverage | Endpoint mana yang dipanggil UI vs yang ada di collection |
| Contract Violations | Schema mismatch, field missing, tipe data salah |
| Undocumented Calls | API call yang tidak ada di collection |
| Trends | Grafik failure rate over time |

### 8.3 Kategori Bug yang Tertangkap

Integrasi ini mendeteksi tiga kategori bug yang sering terlewat:

**1. False green test**
UI test lulus karena DOM element ada, tapi API di bawahnya mengembalikan error yang di-swallow UI gracefully.

**2. Contract drift**
Developer mengubah response schema API (rename field, ubah tipe) tapi UI masih "jalan" karena toleran terhadap perubahan kecil — padahal service lain yang mengkonsumsi API sudah broken.

**3. Undocumented endpoints**
Frontend memanggil endpoint yang tidak terdokumentasi di Postman collection. Endpoint ini tidak punya test, tidak ada monitoring, dan rentan terhadap perubahan tanpa diketahui.

### 8.4 Format Output JSON (untuk integrasi custom)

`results.json` yang dihasilkan Playwright:

```json
{
  "stats": {
    "startTime": "2026-06-28T10:00:00.000Z",
    "duration": 45230,
    "expected": 24,
    "skipped": 0,
    "unexpected": 1,
    "flaky": 0
  },
  "suites": [...],
  "errors": [...]
}
```

---

## 9. Troubleshooting

### Masalah Umum

**Postman tidak menangkap network request:**
- Pastikan `attachNetworkCapture(baseTest)` dipanggil di fixture, bukan di test file langsung
- Pastikan `postman.config.cjs` ada di root project
- Cek `urlPatterns` di config — mungkin URL tidak ter-whitelist

**Test gagal karena timing:**
- Ganti `page.waitForTimeout(2000)` dengan `await expect(element).toBeVisible()`
- Tambahkan `{ timeout: 10000 }` pada assertion yang membutuhkan waktu lebih lama

**Login gagal di CI:**
- Pastikan secrets sudah diset di GitHub repository settings
- Pastikan test user account aktif dan tidak expired di environment staging

**Postman collection tidak ter-update:**
- Jalankan `postman app test --capture-only` untuk capture traffic terbaru
- Review dan approve endpoint baru di Application Inventory
- Sync collection ke workspace

---

## 10. Referensi

- [Postman Playwright Blog Post](https://blog.postman.com/postman-playwright-integration-testing-ui-and-api-together/)
- [Postman Playwright Plugin Docs](https://blog.postman.com/validate-apis-during-your-playwright-tests-with-postman/)
- [Playwright API Testing Docs](https://playwright.dev/docs/api-testing)
- [Postman CLI Reference](https://learning.postman.com/docs/postman-cli/postman-cli-overview/)
- [GitHub Actions Setup Guide](https://playwright.dev/docs/ci-intro)