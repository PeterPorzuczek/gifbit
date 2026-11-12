import { test, expect } from '@playwright/test';
import { starter, starterUrl, mockStarter } from './bank-fixtures.js';

const image =
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="#ff6b3d"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/media\d*\.giphy\.com\//, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: image }),
  );
});

test('a fresh visit selects the starter bank and can immediately start without a key', async ({
  page,
}) => {
  await mockStarter(page, starter);
  await page.goto('');
  await expect(page.locator('.setrow')).toHaveCount(1);
  await expect(page.locator('.setrow')).toContainText(starter.name);
  await expect(page.locator('#source-set')).toBeChecked();
  await expect(page.locator('#set-starter-sample')).toBeChecked();
  await expect(page.locator('#status')).toContainText('330 animations');
  await page.locator('#go-nomic').click();
  await expect(page.locator('#setup')).toBeHidden();
  await expect
    .poll(async () => {
      await page.keyboard.press('Space');
      return page.locator('#layer .g').count();
    })
    .toBeGreaterThan(0);
  await expect(page.locator('#err')).toBeHidden();
});

test('reload reuses one starter set, preserves other sets and settings, and restores a deleted starter', async ({
  page,
}) => {
  let downloads = 0;
  await page.route(starterUrl, (route) => {
    downloads++;
    return route.fulfill({ json: starter });
  });
  await page.goto('');
  await expect(page.locator('#set-starter-sample')).toBeChecked();
  await page.locator('#sets-file').setInputFiles({
    name: 'custom.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ ...starter, name: 'My own set', items: starter.items.slice(0, 2) }),
    ),
  });
  await expect(page.locator('.setrow')).toHaveCount(2);
  await page.locator('label[for="mode-single"]').click();
  await page.reload();
  await expect(page.locator('#set-starter-sample')).toBeChecked();
  await expect(page.locator('.setrow')).toHaveCount(2);
  await expect(page.locator('.setrow').last()).toContainText('My own set');
  await expect(page.locator('#mode-single')).toBeChecked();
  expect(downloads).toBe(1);
  const remove = page.locator('.setrow[data-id="starter-sample"] [data-act="delete"]');
  await remove.click();
  await remove.click();
  await expect(page.locator('.setrow')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#set-starter-sample')).toBeChecked();
  await expect(page.locator('.setrow')).toHaveCount(2);
  expect(downloads).toBe(2);
});

test('a cached starter starts even when GitHub is unavailable', async ({ page }) => {
  await mockStarter(page, starter);
  await page.goto('');
  await expect(page.locator('#set-starter-sample')).toBeChecked();
  await page.unroute(starterUrl);
  let requests = 0;
  await page.route(starterUrl, (route) => {
    requests++;
    return route.abort();
  });
  await page.reload();
  await expect(page.locator('#set-starter-sample')).toBeChecked();
  await expect(page.locator('#status')).toContainText('330 animations');
  expect(requests).toBe(0);
});

test('failed downloads can be retried and malformed data never becomes a set', async ({ page }) => {
  let attempt = 0;
  await page.route(starterUrl, (route) => {
    attempt++;
    return route.fulfill(
      attempt === 1
        ? { status: 429, json: {} }
        : attempt === 2
          ? { body: '{broken' }
          : { json: starter },
    );
  });
  await page.goto('');
  await expect(page.locator('#starter-status')).toContainText('limiting requests');
  await expect(page.locator('#go-nomic')).toBeEnabled();
  await expect(page.locator('.setrow')).toHaveCount(0);
  await page.locator('#starter-retry').click();
  await expect(page.locator('#starter-status')).toContainText('valid JSON');
  await expect(page.locator('.setrow')).toHaveCount(0);
  await page.locator('#starter-retry').click();
  await expect(page.locator('#set-starter-sample')).toBeChecked();
  await expect(page.locator('#starter-retry')).toBeHidden();
});

test('a delayed starter does not override a source chosen while it loads', async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(starterUrl, async (route) => {
    await gate;
    await route.fulfill({ json: starter });
  });
  await page.goto('', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#go-nomic')).toBeDisabled();
  await page.locator('label[for="source-words"]').click();
  await expect(page.locator('#go-nomic')).toBeEnabled();
  await page.locator('#key').fill('my-key');
  release();
  await expect(page.locator('.setrow')).toHaveCount(1);
  await expect(page.locator('#source-words')).toBeChecked();
  await expect(page.locator('#key')).toHaveValue('my-key');
});

test('unavailable storage keeps the starter usable for the current visit', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await mockStarter(page, starter);
  await page.goto('');
  await expect(page.locator('#set-starter-sample')).toBeChecked();
  await expect(page.locator('#starter-status')).toContainText('ready for this visit');
  await page.locator('#go-nomic').click();
  await expect(page.locator('#setup')).toBeHidden();
});
