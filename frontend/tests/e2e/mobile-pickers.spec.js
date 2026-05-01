import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { expectNoHorizontalOverflow, waitForPickerResult } from './helpers/assertions';
import {
  mediaOptions,
  mockMediaLookup,
  mockModerationScopeLookup,
  mockUserLookup,
} from './helpers/lookupMocks';
import { groupId, mockGroupDetailPage, mockModerationPage } from './helpers/routes';

test.describe('mobile picker smoke coverage', () => {
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only picker coverage.');
  });

  test('group post media picker selects an item at 360px', async ({ page }) => {
    await mockAuth(page);
    await mockGroupDetailPage(page);
    await mockMediaLookup(page, mediaOptions);

    await page.goto(`/groups/${groupId}`);

    await page.getByRole('searchbox', { name: 'Attached media' }).fill('arrival');
    await (await waitForPickerResult(page, 'Arrival')).click();

    await expect(page.getByLabel('Remove Arrival')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('moderation assignment scope type can switch at 360px', async ({ page }) => {
    await mockAuth(page);
    await mockModerationPage(page);
    await mockUserLookup(page);
    await mockModerationScopeLookup(page);

    await page.goto('/admin/moderation');

    const assignmentForm = page.locator('form').filter({ hasText: 'Assign moderator' });
    await assignmentForm.locator('select').selectOption({ label: 'Group' });
    await page.getByRole('searchbox', { name: 'Group scope' }).fill('cinema');
    await (await waitForPickerResult(page, 'Cinema Club')).click();

    await assignmentForm.locator('select').selectOption({ label: 'Media' });
    await expect(page.getByRole('searchbox', { name: 'Media scope' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
