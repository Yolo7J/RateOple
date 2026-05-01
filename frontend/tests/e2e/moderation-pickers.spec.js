import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { expectNoHorizontalOverflow, expectRawIdInputsAbsent, waitForPickerResult } from './helpers/assertions';
import {
  mockModerationScopeLookup,
  mockUserLookup,
} from './helpers/lookupMocks';
import { mockModerationPage } from './helpers/routes';

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
  await mockModerationPage(page);
  await mockUserLookup(page);
  await mockModerationScopeLookup(page);
  page.on('dialog', (dialog) => dialog.accept());
});

test('admin can assign moderators with scope-aware pickers', async ({ page }) => {
  await page.goto('/admin/moderation');

  await expect(page.getByRole('heading', { name: 'Moderation' })).toBeVisible();
  await expect(page.getByText('Global assignments apply across all moderation scopes.')).toBeVisible();
  await expect(page.getByRole('searchbox', { name: /scope/i })).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Moderator' }).fill('mira');
  await expect(page.getByText('@mira')).toBeVisible();
  await (await waitForPickerResult(page, 'Mira Moderator')).click();
  await expect(page.getByText('Assign Mira Moderator as moderator for Global.')).toBeVisible();

  const assignmentForm = page.locator('form').filter({ hasText: 'Assign moderator' });
  const scopeType = assignmentForm.locator('select');

  await scopeType.selectOption({ label: 'Group' });
  await page.getByRole('searchbox', { name: 'Group scope' }).fill('cinema');
  await (await waitForPickerResult(page, 'Cinema Club')).click();
  await expect(page.getByText('Assign Mira Moderator as moderator for Cinema Club.')).toBeVisible();

  await scopeType.selectOption({ label: 'Collection' });
  await page.getByRole('searchbox', { name: 'Collection scope' }).fill('modern');
  await (await waitForPickerResult(page, 'Modern Classics')).click();
  await expect(page.getByText('Assign Mira Moderator as moderator for Modern Classics.')).toBeVisible();

  await scopeType.selectOption({ label: 'Media' });
  await page.getByRole('searchbox', { name: 'Media scope' }).fill('arrival');
  await (await waitForPickerResult(page, 'Arrival')).click();
  await expect(page.getByText('Assign Mira Moderator as moderator for Arrival.')).toBeVisible();

  const assignmentRequest = page.waitForRequest((request) => (
    request.method() === 'POST' && request.url().endsWith('/api/moderation/assignments')
  ));
  await page.getByRole('button', { name: 'Assign moderator' }).click();

  expect((await assignmentRequest).postDataJSON()).toEqual({
    userId: 'user-moderator-2',
    scopeType: 4,
    scopeId: 'media-arrival',
  });
  await expect(page.getByText('Moderator: Mira Moderator')).toBeVisible();
  await expect(page.getByText('Scope: Arrival')).toBeVisible();
  await expectRawIdInputsAbsent(page);
  await expectNoHorizontalOverflow(page);
});

test('moderators can ban a user from a group through report row pickers', async ({ page }) => {
  await page.goto('/admin/moderation');

  await expect(page.getByText('Group ban controls')).toBeVisible();

  await page.getByRole('searchbox', { name: 'Group' }).fill('cinema');
  await (await waitForPickerResult(page, 'Cinema Club')).click();
  await expect(page.getByLabel('Remove Cinema Club')).toBeVisible();

  await page.getByRole('searchbox', { name: 'User' }).fill('nikolai');
  await (await waitForPickerResult(page, 'Nikolai Reader')).click();
  await expect(page.getByLabel('Remove Nikolai Reader')).toBeVisible();
  await page.getByPlaceholder('Reason (optional)').fill('Repeated spam.');

  const banRequest = page.waitForRequest((request) => (
    request.method() === 'POST' && request.url().endsWith('/api/groups/group-cinema/bans')
  ));
  await page.getByRole('button', { name: 'Ban user (group)' }).click();

  expect((await banRequest).postDataJSON()).toEqual({
    userId: 'user-reported-3',
    reason: 'Repeated spam.',
  });
  await expect(page.getByText(/group-cinema|user-reported-3/i)).toHaveCount(0);
  await expectRawIdInputsAbsent(page);
  await expectNoHorizontalOverflow(page);
});
