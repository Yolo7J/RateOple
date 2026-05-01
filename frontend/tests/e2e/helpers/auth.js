export const adminUser = {
  id: 'user-admin-1',
  userName: 'admin',
  roles: ['Admin', 'Moderator', 'User'],
};

export async function mockAuth(page, user = adminUser) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ json: user });
  });

  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({ json: user });
  });

  await page.route('**/api/csrf', async (route) => {
    await route.fulfill({ json: { token: 'e2e-csrf-token' } });
  });

  await page.route('**/hubs/notifications/negotiate**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
}
