import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { expectNoHorizontalOverflow, waitForPickerResult } from './helpers/assertions';
import { mediaOptions, mockMediaLookup } from './helpers/lookupMocks';
import { collectionId, mockCollectionDetailPage } from './helpers/routes';

test('EntityPicker can search and select an option', async ({ page }) => {
  await mockAuth(page);
  await mockCollectionDetailPage(page);
  await mockMediaLookup(page, mediaOptions);

  await page.goto(`/collections/${collectionId}`);

  await page.getByRole('searchbox', { name: 'Media' }).fill('spirited');
  await expect(page.getByText('Movie · 2001')).toBeVisible();
  await (await waitForPickerResult(page, 'Spirited Away')).click();

  await expect(page.getByLabel('Remove Spirited Away')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Spirited Away' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
