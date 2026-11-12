import { test, expect } from '@playwright/test';

test('microphone denial leaves manual playback available', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Denied', 'NotAllowedError');
    };
  });
  await page.goto('');
  await page.locator('#sample-load').click();
  await page.locator('#go').click();
  await expect(page.locator('#err')).toContainText('not allowed');
  await expect(page.locator('#go')).toBeEnabled();
  await page.locator('#go-nomic').click();
  await expect(page.locator('#setup')).toBeHidden();
});

test('the fallback detector works and page exit releases its audio stream', async ({ page }) => {
  await page.addInitScript(() => {
    window.AudioWorkletNode = undefined;
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      window.testStream = await getUserMedia(constraints);
      return window.testStream;
    };
  });
  await page.goto('');
  await page.locator('#sample-load').click();
  await page.locator('#bpm').fill('120');
  await page.locator('#b-cal').click();
  await expect(page.locator('#cal')).toBeVisible();
  expect(await page.evaluate(() => window.testStream.getAudioTracks()[0].readyState)).toBe('live');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  expect(await page.evaluate(() => window.testStream.getAudioTracks()[0].readyState)).toBe('ended');
});
