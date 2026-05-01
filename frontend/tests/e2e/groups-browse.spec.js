import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { expectNoHorizontalOverflow } from './helpers/assertions';

const publicGroups = [
  {
    id: 'group-cinema',
    name: 'Cinema Club',
    description: 'Film discussion and watch parties.',
    visibility: 1,
    membersCount: 24,
    postsCount: 8,
    createdAt: '2026-05-01T08:00:00Z',
  },
];

const privateGroups = [
  {
    id: 'group-private',
    name: 'Private Review Circle',
    description: 'Invite-only criticism group.',
    visibility: 2,
    membersCount: 6,
    postsCount: 12,
    createdAt: '2026-05-01T08:00:00Z',
  },
];

async function mockGroupsBrowse(page, options = {}) {
  const groupRequests = [];

  await page.route('**/api/groups?**', async (route) => {
    const url = new URL(route.request().url());
    groupRequests.push(url);

    let items = options.empty ? [] : publicGroups;
    if (url.searchParams.get('visibility') === 'Private') {
      items = options.empty ? [] : privateGroups;
    }

    await route.fulfill({
      json: {
        items,
        totalCount: items.length,
        page: 1,
        pageSize: 30,
      },
    });
  });

  return groupRequests;
}

test('group browse search and visibility use real API query params', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop group browse coverage.');

  await mockAuth(page);
  const groupRequests = await mockGroupsBrowse(page);

  await page.goto('/groups');
  await expect(page.getByRole('heading', { name: 'Cinema Club' })).toBeVisible();

  await page.getByPlaceholder('Search groups').fill('cinema');
  await expect
    .poll(() => groupRequests.some((url) => url.searchParams.get('search') === 'cinema'))
    .toBe(true);

  await page.getByLabel('Group visibility').selectOption('Private');
  await expect(page.getByRole('heading', { name: 'Private Review Circle' })).toBeVisible();
  await expect
    .poll(() => groupRequests.some((url) => url.searchParams.get('visibility') === 'Private'))
    .toBe(true);

  await expect(page.getByRole('option', { name: 'All media types' })).toHaveCount(0);
  await expect(page.getByRole('option', { name: 'All tags' })).toHaveCount(0);
});

test('group browse shows an empty state for no groups', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop empty-state coverage.');

  await mockAuth(page);
  await mockGroupsBrowse(page, { empty: true });

  await page.goto('/groups');

  await expect(page.getByText('No groups found.')).toBeVisible();
  await expect(page.getByRole('option', { name: 'All media types' })).toHaveCount(0);
  await expect(page.getByRole('option', { name: 'All tags' })).toHaveCount(0);
});

test('group browse is usable at 360px without fake filters or overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile group browse coverage.');

  await mockAuth(page);
  const groupRequests = await mockGroupsBrowse(page);

  await page.goto('/groups');
  await page.getByPlaceholder('Search groups').fill('cinema');
  await page.getByLabel('Group visibility').selectOption('Public');

  await expect(page.getByRole('heading', { name: 'Cinema Club' })).toBeVisible();
  await expect
    .poll(() => groupRequests.some((url) => (
      url.searchParams.get('search') === 'cinema' &&
      url.searchParams.get('visibility') === 'Public'
    )))
    .toBe(true);
  await expect(page.getByRole('option', { name: 'All media types' })).toHaveCount(0);
  await expect(page.getByRole('option', { name: 'All tags' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
