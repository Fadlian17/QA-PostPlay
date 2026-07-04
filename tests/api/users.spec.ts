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

    if (!loginRes.ok()) {
      throw new Error(`Login failed with status ${loginRes.status()}`);
    }

    const json = await loginRes.json();
    authToken = json.accessToken;
  });

  test('GET /api/users - mengembalikan list users dengan schema yang benar', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.data)).toBeTruthy();

    if (body.data.length > 0) {
      const user = body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('createdAt');
      expect(typeof user.id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(['admin', 'editor', 'viewer']).toContain(user.role);
    }

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
