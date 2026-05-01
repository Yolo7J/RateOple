import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { expectNoHorizontalOverflow, expectRawIdInputsAbsent, waitForPickerResult } from './helpers/assertions';
import { mediaOptions, mockMediaLookup } from './helpers/lookupMocks';
import { collectionId, createCollectionDetail, mockCollectionDetailPage } from './helpers/routes';

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
  await mockCollectionDetailPage(page, {
    collection: createCollectionDetail({
      items: [
        {
          mediaId: 'media-spirited-away',
          mediaTitle: 'Spirited Away',
          coverUrl: null,
        },
      ],
    }),
  });
  await mockMediaLookup(page, mediaOptions);
});

test('collection owner can add media through the picker', async ({ page }) => {
  await page.goto(`/collections/${collectionId}`);

  await expect(page.getByRole('heading', { name: 'Modern Classics' })).toBeVisible();
  await expectRawIdInputsAbsent(page);

  const mediaPicker = page.getByRole('searchbox', { name: 'Media' });
  await mediaPicker.fill('arrival');
  await expect(page.getByText('Movie · 2016')).toBeVisible();
  await (await waitForPickerResult(page, 'Arrival')).click();

  await expect(page.getByLabel('Remove Arrival')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Arrival' })).toBeEnabled();

  const addRequest = page.waitForRequest((request) => (
    request.method() === 'POST' && request.url().endsWith(`/api/collections/${collectionId}/items`)
  ));
  await page.getByRole('button', { name: 'Add Arrival' }).click();

  expect((await addRequest).postDataJSON()).toEqual({
    mediaId: 'media-arrival',
    orderIndex: null,
  });
  await expectRawIdInputsAbsent(page);
  await expectNoHorizontalOverflow(page);
});

test('collection picker blocks existing media before submit', async ({ page }) => {
  await page.goto(`/collections/${collectionId}`);

  const mediaPicker = page.getByRole('searchbox', { name: 'Media' });
  await mediaPicker.fill('spirited');
  await expect(page.getByText('Movie · 2001')).toBeVisible();
  await (await waitForPickerResult(page, 'Spirited Away')).click();

  await expect(page.getByLabel('Remove Spirited Away')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Already in Collection' })).toBeDisabled();
  await expectRawIdInputsAbsent(page);
  await expectNoHorizontalOverflow(page);
});
