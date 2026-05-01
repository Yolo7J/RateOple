import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { expectNoHorizontalOverflow } from './helpers/assertions';

const mediaResults = [
  {
    id: 'media-inception',
    type: 'Movie',
    title: 'Inception',
    releaseYear: 2010,
    coverUrl: null,
    averageRating: 4.7,
    ratingsCount: 120,
    genres: ['Sci-Fi'],
    tags: [],
  },
];

async function mockMediaBrowse(page, options = {}) {
  const mediaRequests = [];

  await page.route('**/api/media/genres', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/media?**', async (route) => {
    mediaRequests.push(new URL(route.request().url()));
    await route.fulfill({
      json: {
        items: options.empty ? [] : mediaResults,
        totalCount: options.empty ? 0 : mediaResults.length,
        page: 1,
        pageSize: 24,
        totalPages: 1,
      },
    });
  });

  return mediaRequests;
}

test('desktop header search navigates to media results and queries the API', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop header coverage.');

  await mockAuth(page);
  const mediaRequests = await mockMediaBrowse(page);

  await page.goto('/media');
  await page.getByRole('textbox', { name: 'Search...' }).fill('  inception  ');
  await page.getByRole('textbox', { name: 'Search...' }).press('Enter');

  await expect(page).toHaveURL(/\/media\?search=inception$/);
  await expect(page.getByRole('heading', { name: 'Search results for "inception"' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Inception', exact: true })).toBeVisible();
  await expect
    .poll(() => mediaRequests.some((url) => url.searchParams.get('search') === 'inception'))
    .toBe(true);
});

test('media search shows an empty result state for empty API results', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop search result coverage.');

  await mockAuth(page);
  const mediaRequests = await mockMediaBrowse(page, { empty: true });

  await page.goto('/media?search=missing%20title');

  await expect(page.getByRole('textbox', { name: 'Search...' })).toHaveValue('missing title');
  await expect(page.getByText('No media found for "missing title". Try another search or clear filters.')).toBeVisible();
  await expect
    .poll(() => mediaRequests.some((url) => url.searchParams.get('search') === 'missing title'))
    .toBe(true);
});

test('mobile header search submits and closes without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile search coverage.');

  await mockAuth(page);
  const mediaRequests = await mockMediaBrowse(page);

  await page.goto('/media');
  await page.getByLabel('Search', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Search...' }).fill('arrival');
  await page.getByRole('textbox', { name: 'Search...' }).press('Enter');

  await expect(page).toHaveURL(/\/media\?search=arrival$/);
  await expect(page.getByRole('button', { name: 'Close search' })).toHaveCount(0);
  await expect
    .poll(() => mediaRequests.some((url) => url.searchParams.get('search') === 'arrival'))
    .toBe(true);
  await expectNoHorizontalOverflow(page);
});
