import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers/assertions';

const authenticatedUser = {
  id: 'user-admin-1',
  userName: 'admin',
  roles: ['Admin', 'Moderator', 'User'],
};

async function mockGuestAuth(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
  });

  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
  });

  await page.route('**/api/csrf', async (route) => {
    await route.fulfill({ json: { token: 'e2e-csrf-token' } });
  });
}

async function mockAuthenticatedAuth(page, options = {}) {
  let meCallCount = 0;
  const user = options.user ?? authenticatedUser;

  await page.route('**/api/auth/me', async (route) => {
    meCallCount += 1;
    await route.fulfill({ json: user });
  });

  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({ json: user });
  });

  await page.route('**/api/csrf', async (route) => {
    await route.fulfill({ json: { token: 'e2e-csrf-token' } });
  });

  await page.route('**/api/notifications**', async (route) => {
    await route.fulfill({ json: { items: [], totalCount: 0, page: 1, pageSize: 1 } });
  });

  await page.route('**/hubs/notifications/negotiate**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  return {
    getMeCallCount: () => meCallCount,
  };
}

test('login page shows Google sign-in and preserves a safe local return URL', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop auth callback coverage.');

  await mockGuestAuth(page);

  let googleLoginRequestUrl = null;
  await page.route('**/api/auth/google/login**', async (route) => {
    googleLoginRequestUrl = route.request().url();
    await route.fulfill({
      status: 302,
      headers: {
        location: `${testInfo.project.use.baseURL}/auth/callback?returnUrl=%2Fgroups&externalLogin=failed`,
      },
      body: '',
    });
  });

  await page.goto('/login?returnUrl=%2Fgroups');

  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();

  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect.poll(() => googleLoginRequestUrl).not.toBeNull();

  const requestUrl = new URL(googleLoginRequestUrl);
  expect(requestUrl.origin).toBe('http://127.0.0.1:5113');
  expect(requestUrl.pathname).toBe('/api/auth/google/login');
  expect(requestUrl.searchParams.get('returnUrl')).toBe('/auth/callback?returnUrl=%2Fgroups');
});

test('Google sign-in ignores unsafe external return URLs', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop auth callback coverage.');

  await mockGuestAuth(page);

  let googleLoginRequestUrl = null;
  await page.route('**/api/auth/google/login**', async (route) => {
    googleLoginRequestUrl = route.request().url();
    await route.fulfill({
      status: 302,
      headers: {
        location: `${testInfo.project.use.baseURL}/auth/callback?externalLogin=failed`,
      },
      body: '',
    });
  });

  await page.goto('/login?returnUrl=https://evil.example.com/phish');
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect.poll(() => googleLoginRequestUrl).not.toBeNull();
  expect(new URL(googleLoginRequestUrl).searchParams.get('returnUrl')).toBe('/auth/callback');
});

test('register page shows Google sign-in and keeps email registration available', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop auth coverage.');

  await mockGuestAuth(page);
  await page.goto('/register?returnUrl=%2Fgroups');

  await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
});

test('failed Google sign-in returns to login with a friendly message and clean URL', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop auth callback coverage.');

  await mockGuestAuth(page);
  await page.goto('/auth/callback?externalLogin=failed&returnUrl=%2Fgroups');

  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fgroups$/);
  await expect(page.getByText('Google sign-in failed. Try again or use email/password.')).toBeVisible();
  await expect(page).not.toHaveURL(/externalLogin=/);
});

test('Google not-configured callback shows a specific fallback message', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop auth callback coverage.');

  await mockGuestAuth(page);
  await page.goto('/auth/callback?externalLogin=failed&error=not_configured&returnUrl=%2Fgroups');

  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fgroups$/);
  await expect(page.getByText('Google sign-in is not available right now. Try email/password instead.')).toBeVisible();
});

test('successful Google sign-in refreshes auth state and redirects to the intended route', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop auth callback coverage.');

  const auth = await mockAuthenticatedAuth(page);

  await page.route('**/api/groups?**', async (route) => {
    await route.fulfill({
      json: {
        items: [],
        page: 1,
        pageSize: 30,
        totalCount: 0,
      },
    });
  });

  await page.goto('/auth/callback?externalLogin=success&returnUrl=%2Fgroups');

  await expect(page).toHaveURL(/\/groups$/);
  await expect(page.getByRole('heading', { name: 'Groups', exact: true })).toBeVisible();
  await expect.poll(() => auth.getMeCallCount()).toBeGreaterThan(1);
  await expect(page).not.toHaveURL(/externalLogin=/);
});

test('auth pages stay usable on mobile without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile auth coverage.');

  await mockGuestAuth(page);
  await page.goto('/login?returnUrl=%2Fgroups');

  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
