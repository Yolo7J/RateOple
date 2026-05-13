import { expect, test } from '@playwright/test';

const api = 'http://localhost:5113/api';

async function mockModeratorSession(page) {
  await page.route(`${api}/auth/me`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mod-1',
        userName: 'moderator',
        roles: ['Moderator'],
      }),
    });
  });
  await page.route(`${api}/auth/refresh`, (route) => {
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  await page.route('http://localhost:5113/hubs/notifications**', (route) => {
    route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('no-assignment moderator sees moderation shell empty state', async ({ page }) => {
  await mockModeratorSession(page);
  await page.route(`${api}/moderation/reports**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
        hasActiveModerationAssignments: false,
        canSeeAllReports: false,
      }),
    });
  });

  await page.goto('/admin/moderation');

  await expect(page.getByRole('heading', { name: 'Moderation queue' })).toBeVisible();
  await expect(page.getByText('You do not have any active moderation assignments.')).toBeVisible();
});

test('moderation queue renders report rows and actions', async ({ page }) => {
  await mockModeratorSession(page);
  await page.route(`${api}/moderation/reports**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'report-1',
            reporterId: 'reporter-1',
            reporterDisplayName: 'Casey Reporter',
            targetType: 2,
            targetId: 'comment-1',
            targetDisplayName: 'Comment by Alex: "Spam link"',
            targetAuthorId: 'author-1',
            targetAuthorDisplayName: 'Alex Author',
            scopeType: 2,
            scopeId: 'group-1',
            scopeName: 'Cinema Club',
            reason: 'Spam',
            status: 1,
            createdAt: '2026-05-13T08:00:00Z',
            updatedAt: null,
            reviewedById: null,
            reviewedByDisplayName: null,
            targetActions: {
              canRemoveTarget: true,
              removeUnavailableReason: null,
            },
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 50,
        hasActiveModerationAssignments: true,
        canSeeAllReports: false,
      }),
    });
  });

  await page.goto('/admin/moderation');

  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText('Cinema Club')).toBeVisible();
  await expect(page.getByText('Alex Author')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark In Review' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escalate to Admin' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove target' })).toBeVisible();
});
