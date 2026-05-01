import { expect } from '@playwright/test';

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: element.textContent?.trim().slice(0, 80) ?? '',
          left: Math.floor(rect.left),
          right: Math.ceil(rect.right),
          width: Math.ceil(rect.width),
        };
      })
      .filter((item) => item.right > clientWidth || item.left < 0)
      .slice(0, 5);

    return { hasOverflow: scrollWidth > clientWidth, clientWidth, scrollWidth, offenders };
  });
  expect(overflow, JSON.stringify(overflow, null, 2)).toMatchObject({ hasOverflow: false });
}

export async function waitForPickerResult(page, label) {
  const result = page.getByRole('listbox').getByRole('button', { name: new RegExp(label, 'i') }).first();
  await expect(result).toBeVisible();
  return result;
}

export async function expectRawIdInputsAbsent(page) {
  await expect(page.getByLabel(/media id|user id|group id|collection id|scope id|guid/i)).toHaveCount(0);
  await expect(page.getByPlaceholder(/media id|user id|group id|collection id|scope id|guid/i)).toHaveCount(0);
}
