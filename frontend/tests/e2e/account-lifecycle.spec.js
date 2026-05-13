import { expect, test } from '@playwright/test';

const api = 'http://localhost:5113/api';

async function mockCsrf(page) {
  await page.route(`${api}/csrf`, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'csrf-token' }) });
  });
}

async function mockSession(page, session) {
  await page.route(`${api}/auth/me`, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
  });
  await page.route(`${api}/auth/refresh`, (route) => {
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  await page.route('http://localhost:5113/hubs/notifications**', (route) => {
    route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('login page has forgot-password link', async ({ page }) => {
  await page.route(`${api}/auth/me`, (route) => route.fulfill({ status: 401, body: '{}' }));
  await page.route(`${api}/auth/refresh`, (route) => route.fulfill({ status: 401, body: '{}' }));

  await page.goto('/login');

  await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
});

test('forgot-password form shows generic success', async ({ page }) => {
  await mockCsrf(page);
  await page.route(`${api}/auth/me`, (route) => route.fulfill({ status: 401, body: '{}' }));
  await page.route(`${api}/auth/refresh`, (route) => route.fulfill({ status: 401, body: '{}' }));
  await page.route(`${api}/auth/forgot-password`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'If an account exists, a reset email has been sent.' }),
    });
  });

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('person@example.test');
  await page.getByRole('button', { name: 'Send reset email' }).click();

  await expect(page.getByText('If an account exists, a reset email has been sent.')).toBeVisible();
});

test('register page shows confirmation flow message', async ({ page }) => {
  await page.route(`${api}/auth/me`, (route) => route.fulfill({ status: 401, body: '{}' }));
  await page.route(`${api}/auth/refresh`, (route) => route.fulfill({ status: 401, body: '{}' }));

  await page.goto('/register');

  await expect(page.getByText('After registration, confirm your email')).toBeVisible();
});

test('unconfirmed state renders resend confirmation affordance', async ({ page }) => {
  await mockCsrf(page);
  await mockSession(page, {
    id: 'user-1',
    userName: 'pending',
    email: 'pending@example.test',
    emailConfirmed: false,
    isReadOnly: true,
    accountState: 'unconfirmed',
    roles: ['User'],
  });
  await page.route(`${api}/auth/resend-confirmation`, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });

  await page.goto('/groups');

  await expect(page.getByText('Confirm your email to create ratings')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resend confirmation' })).toBeVisible();
});

test('read-only account blocks create-group route', async ({ page }) => {
  await mockSession(page, {
    id: 'user-1',
    userName: 'pending',
    email: 'pending@example.test',
    emailConfirmed: false,
    isReadOnly: true,
    accountState: 'unconfirmed',
    roles: ['User'],
  });

  await page.goto('/groups/new');

  await expect(page.getByRole('heading', { name: 'Confirm your email first' })).toBeVisible();
});

test('suspended account sees appeal path on create route', async ({ page }) => {
  await mockSession(page, {
    id: 'user-2',
    userName: 'suspended',
    email: 'suspended@example.test',
    emailConfirmed: true,
    isSuspended: true,
    isReadOnly: true,
    accountState: 'suspended',
    roles: ['User'],
  });

  await page.goto('/collections/new');

  await expect(page.getByRole('heading', { name: 'Account suspended' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Submit appeal' })).toBeVisible();
});
