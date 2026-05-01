import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { expectNoHorizontalOverflow, expectRawIdInputsAbsent, waitForPickerResult } from './helpers/assertions';
import { mediaOptions, mockMediaLookup } from './helpers/lookupMocks';
import { groupId, mockGroupDetailPage } from './helpers/routes';

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
  await mockGroupDetailPage(page);
  await mockMediaLookup(page, mediaOptions);
});

test('staff can pin media through the media picker', async ({ page }) => {
  await page.goto(`/groups/${groupId}`);

  await expect(page.getByRole('heading', { name: 'Cinema Club' })).toBeVisible();
  await expectRawIdInputsAbsent(page);

  await page.getByRole('searchbox', { name: 'Media to pin' }).fill('spirited');
  await expect(page.getByText('Movie · 2001')).toBeVisible();
  await (await waitForPickerResult(page, 'Spirited Away')).click();
  await expect(page.getByLabel('Remove Spirited Away')).toBeVisible();

  const pinRequest = page.waitForRequest((request) => (
    request.method() === 'POST' && request.url().endsWith(`/api/groups/${groupId}/pinned-media`)
  ));
  await page.getByRole('button', { name: 'Pin Spirited Away' }).click();

  expect((await pinRequest).postDataJSON()).toEqual({ mediaId: 'media-spirited-away' });
  await expectRawIdInputsAbsent(page);
  await expectNoHorizontalOverflow(page);
});

test('members can attach multiple media items to a group post', async ({ page }) => {
  await page.goto(`/groups/${groupId}`);

  await page.getByPlaceholder('Post title').fill('Weekend watch list');
  await page.getByPlaceholder('Post content').fill('Two films for the group queue.');

  const mediaPicker = page.getByRole('searchbox', { name: 'Attached media' });
  await mediaPicker.fill('spirited');
  await (await waitForPickerResult(page, 'Spirited Away')).click();
  await expect(page.getByLabel('Remove Spirited Away')).toBeVisible();

  await mediaPicker.fill('arrival');
  await (await waitForPickerResult(page, 'Arrival')).click();
  await expect(page.getByLabel('Remove Arrival')).toBeVisible();

  await page.getByLabel('Remove Spirited Away').click();
  await expect(page.getByLabel('Remove Spirited Away')).toHaveCount(0);
  await expect(page.getByLabel('Remove Arrival')).toBeVisible();

  const postRequest = page.waitForRequest((request) => (
    request.method() === 'POST' && request.url().includes(`/api/groups/${groupId}/posts`)
  ));
  await page.getByRole('button', { name: 'Publish Post' }).click();

  expect((await postRequest).postDataJSON()).toMatchObject({
    title: 'Weekend watch list',
    content: 'Two films for the group queue.',
    mediaIds: ['media-arrival'],
  });
  await expect(page.getByText(/comma-separated media/i)).toHaveCount(0);
  await expectRawIdInputsAbsent(page);
  await expectNoHorizontalOverflow(page);
});
