import { expect, test } from '@playwright/test';

const api = 'http://localhost:5113/api';

async function mockCsrf(page) {
  await page.route(`${api}/csrf`, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'csrf-token' }) });
  });
}

async function mockLoggedOut(page) {
  await page.route(`${api}/auth/me`, (route) => route.fulfill({ status: 401, body: '{}' }));
  await page.route(`${api}/auth/refresh`, (route) => route.fulfill({ status: 401, body: '{}' }));
}

async function mockCaptchaConfig(page, enabled = false) {
  await page.route(`${api}/auth/captcha-config`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        enabled,
        provider: enabled ? 'Turnstile' : 'Noop',
        siteKey: enabled ? 'test-site-key' : null,
        loginFailureThreshold: 2,
      }),
    });
  });
}

async function mockTurnstile(page) {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.turnstile = {
          render: (element, options) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Complete CAPTCHA';
            button.addEventListener('click', () => options.callback('test-captcha-token'));
            element.appendChild(button);
            return 'widget-id';
          },
          reset: () => {},
          remove: () => {}
        };
      `,
    });
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
  await mockLoggedOut(page);
  await mockCaptchaConfig(page);

  await page.goto('/login');

  await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
});

test('forgot-password form shows generic success', async ({ page }) => {
  await mockCsrf(page);
  await mockLoggedOut(page);
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
  await mockLoggedOut(page);
  await mockCaptchaConfig(page);

  await page.goto('/register');

  await expect(page.getByText('After registration, confirm your email')).toBeVisible();
});

test('register page renders CAPTCHA when configured', async ({ page }) => {
  await mockLoggedOut(page);
  await mockCaptchaConfig(page, true);
  await mockTurnstile(page);

  await page.goto('/register');

  await expect(page.getByTestId('register-turnstile')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete CAPTCHA' })).toBeVisible();
});

test('register submits CAPTCHA token', async ({ page }) => {
  await mockLoggedOut(page);
  await mockCaptchaConfig(page, true);
  await mockTurnstile(page);
  await mockCsrf(page);
  let payload;
  await page.route(`${api}/auth/register`, async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/register');
  await page.getByLabel('Email').fill('new-user@example.test');
  await page.getByLabel('Username').fill('newuser');
  await page.getByLabel('Password', { exact: true }).fill('Password1!');
  await page.getByLabel('Confirm password').fill('Password1!');
  await page.getByRole('button', { name: 'Complete CAPTCHA' }).click();
  await page.getByRole('button', { name: 'Register' }).click();

  await expect.poll(() => payload?.captchaToken).toBe('test-captcha-token');
});

test('login renders CAPTCHA only after backend requires it and submits token', async ({ page }) => {
  await mockLoggedOut(page);
  await mockCaptchaConfig(page, true);
  await mockTurnstile(page);
  await mockCsrf(page);
  let loginCalls = 0;
  let secondPayload;
  await page.route(`${api}/auth/login`, async (route) => {
    loginCalls += 1;
    if (loginCalls === 1) {
      await route.fulfill({
        status: 403,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'CAPTCHA required.',
          detail: 'Complete CAPTCHA to continue.',
          message: 'Complete CAPTCHA to continue.',
          code: 'captcha_required',
          requiresCaptcha: true,
        }),
      });
      return;
    }

    secondPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'user-1', userName: 'person', email: 'person@example.test', roles: ['User'] }),
    });
  });

  await page.goto('/login');
  await expect(page.getByTestId('login-turnstile')).toHaveCount(0);
  await page.getByLabel('Email').fill('person@example.test');
  await page.getByLabel('Password').fill('Password1!');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByTestId('login-turnstile')).toBeVisible();
  await page.getByRole('button', { name: 'Complete CAPTCHA' }).click();
  await page.getByRole('button', { name: 'Login' }).click();

  await expect.poll(() => secondPayload?.captchaToken).toBe('test-captcha-token');
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
