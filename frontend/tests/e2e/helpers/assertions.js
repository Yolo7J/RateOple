import { expect } from '@playwright/test';

export async function expectNoHorizontalOverflow(page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasOverflow).toBeFalsy();
}

export async function waitForPickerResult(page, label) {
  const result = page.getByRole('button', { name: new RegExp(label, 'i') }).last();
  await expect(result).toBeVisible();
  return result;
}

export async function expectRawIdInputsAbsent(page) {
  await expect(page.getByLabel(/media id|user id|group id|collection id|scope id|guid/i)).toHaveCount(0);
  await expect(page.getByPlaceholder(/media id|user id|group id|collection id|scope id|guid/i)).toHaveCount(0);
}
