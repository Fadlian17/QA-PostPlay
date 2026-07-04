import { test, expect } from '@playwright/test';

test.describe('API Contract Validation', () => {
  test('API base URL tersedia dari environment', async () => {
    expect(process.env.API_BASE_URL).toBeDefined();
  });

  test('Health check endpoint mengembalikan status 200', async ({ request }) => {
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3001';
    const response = await request.get(`${baseURL}/api/health`);

    expect([200, 204]).toContain(response.status());
    expect(response.headers()['content-type']).toContain('application/json');
  });
});
