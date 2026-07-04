import { APIRequestContext, BrowserContext } from '@playwright/test';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

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
