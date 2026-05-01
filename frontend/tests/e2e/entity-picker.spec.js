import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { expectNoHorizontalOverflow, waitForPickerResult } from './helpers/assertions';
import { mediaOptions, mockMediaLookup } from './helpers/lookupMocks';
import { collectionId, mockCollectionDetailPage } from './helpers/routes';

async function openCollectionPicker(page, lookupOptions = mediaOptions, options = {}) {
  await mockAuth(page);
  await mockCollectionDetailPage(page);
  await mockMediaLookup(page, lookupOptions, options);

  await page.goto(`/collections/${collectionId}`);
  return page.getByRole('searchbox', { name: 'Media' });
}

test('EntityPicker can search, select, preview, and remove an option', async ({ page }) => {
  const picker = await openCollectionPicker(page);

  await picker.click();
  await expect(page.getByRole('listbox')).toBeVisible();

  await picker.fill('spirited');
  await expect(page.getByText('Movie · 2001')).toBeVisible();
  await (await waitForPickerResult(page, 'Spirited Away')).click();

  await expect(page.getByLabel('Remove Spirited Away')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Spirited Away' })).toBeVisible();

  await page.getByLabel('Remove Spirited Away').click();
  await expect(page.getByLabel('Remove Spirited Away')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add Media' })).toBeDisabled();
  await expectNoHorizontalOverflow(page);
});

test('EntityPicker closes with Escape and selects first result with Enter', async ({ page }) => {
  const picker = await openCollectionPicker(page);

  await picker.fill('arrival');
  await expect(page.getByText('Movie · 2016')).toBeVisible();
  await picker.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);

  await picker.fill('');
  await picker.fill('arrival');
  await expect(page.getByText('Movie · 2016')).toBeVisible();
  await picker.press('Enter');

  await expect(page.getByLabel('Remove Arrival')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Arrival' })).toBeVisible();
});

test('EntityPicker shows empty and error states', async ({ page }) => {
  let picker = await openCollectionPicker(page, []);

  await picker.fill('missing');
  await expect(page.getByText('No matches found.')).toBeVisible();

  await page.unrouteAll({ behavior: 'ignoreErrors' });
  picker = await openCollectionPicker(page, mediaOptions, { fail: true });

  await picker.fill('arrival');
  await expect(page.getByText('Could not load results.')).toBeVisible();
});

test('EntityPicker is usable without mobile horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile smoke coverage.');

  const picker = await openCollectionPicker(page);

  await picker.fill('spirited');
  await expect(page.getByText('Movie · 2001')).toBeVisible();
  await (await waitForPickerResult(page, 'Spirited Away')).click();

  await expect(page.getByLabel('Remove Spirited Away')).toBeVisible();
  await page.getByLabel('Remove Spirited Away').click();
  await expect(page.getByLabel('Remove Spirited Away')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
