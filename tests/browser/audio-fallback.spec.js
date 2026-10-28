import { test, expect } from '@playwright/test';

test('microphone denial leaves manual playback available', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Denied', 'NotAllowedError');
    };
  });
  await page.goto('./');
  await page.locator('#sample-load').click();
  await page.locator('#go').click();
  await expect(page.locator('#err')).toContainText('not allowed');
  await expect(page.locator('#go')).toBeEnabled();
  await page.locator('#go-nomic').click();
  await expect(page.locator('#setup')).toBeHidden();
});

