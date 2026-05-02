import { expect, test } from '@playwright/test';

const poster =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480">
      <rect width="320" height="480" fill="#202632"/>
      <text x="160" y="245" font-family="Arial" font-size="28" fill="#f5c518" text-anchor="middle">RateOple</text>
    </svg>
  `);

const mediaItems = [
  {
    id: 'movie-1',
    title: 'The Shared System',
    type: 'Movie',
    releaseYear: 2026,
    coverUrl: poster,
    averageRating: 8.7,
    ratingsCount: 42,
  },
  {
    id: 'book-1',
    title: 'Design Tokens',
    type: 'Book',
    releaseYear: 2025,
    coverUrl: poster,
    averageRating: 8.1,
    ratingsCount: 18,
  },
];

async function mockApi(page) {
  await page.route('http://localhost:5113/api/auth/me', (route) => {
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  await page.route('http://localhost:5113/api/auth/refresh', (route) => {
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  await page.route('http://localhost:5113/api/discovery/trending**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mediaItems) });
  });
  await page.route('http://localhost:5113/api/discovery/popular**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mediaItems) });
  });
}

test('discovery shared UI renders without horizontal overflow', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');

  await expect(page.getByRole('button', { name: 'RateOple' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trending Now' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open The Shared System/i }).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
