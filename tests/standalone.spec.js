import { test, expect } from '@playwright/test';
import { mkdtemp, copyFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('copied HTML runs alone from disk with sample data and an embedded audio worklet', async ({
  page,
}) => {
  const folder = await mkdtemp(join(tmpdir(), 'gifbit-standalone-'));
  const file = join(folder, 'gifbit.html');
  const errors = [];
  const localRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().startsWith('file:') && request.url() !== pathToFileURL(file).href)
      localRequests.push(request.url());
  });
  try {
    await copyFile(new URL('../dist/gifbit.html', import.meta.url), file);
    await page.route(/https:\/\/media\d*\.giphy\.com\//, (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="orange"/></svg>',
      }),
    );
    await page.goto(pathToFileURL(file).href);
    await page.locator('#sample-load').click();
    await expect(page.locator('.setrow')).toHaveCount(1);
    await page.locator('#b-curate').click();
    await expect(page.locator('#in-count')).toHaveText('255');
    await page.locator('#cur-done').click();
    await page.evaluate(() => {
      window.workletNodes = 0;
      const NativeNode = window.AudioWorkletNode;
      window.AudioWorkletNode = class extends NativeNode {
        constructor(...args) {
          super(...args);
          window.workletNodes++;
        }
      };
    });
    await page.locator('#bpm').fill('120');
    await page.locator('#b-cal').click();
    await expect(page.locator('#cal')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.workletNodes)).toBe(1);
    await page.locator('#cal-done').click();
    await page.locator('#go').click();
    await expect
      .poll(async () => {
        await page.keyboard.press('Space');
        return page.locator('#layer .g').count();
      })
      .toBeGreaterThan(0);
    expect(localRequests).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await page.goto('about:blank');
    await rm(file);
    await rmdir(folder);
  }
});
