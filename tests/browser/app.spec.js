import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const samplePath = fileURLToPath(new URL('../../sample.json', import.meta.url));
const sample = JSON.parse(await readFile(samplePath));
const image =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#ff6b3d"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/media\d*\.giphy\.com\//, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: image }),
  );
  await page.goto('./');
  await expect(page.locator('#source-words')).toBeChecked();
});

async function sampleSet(page) {
  await page.locator('#sample-load').click();
  await expect(page.locator('.setrow')).toHaveCount(1);
  await expect(page.locator('#source-set')).toBeChecked();
}

async function manualStart(page) {
  await page.locator('#go-nomic').click();
  await expect(page.locator('#setup')).toBeHidden();
  await expect
    .poll(async () => {
      await page.keyboard.press('Space');
      return page.locator('#layer .g').count();
    })
    .toBeGreaterThan(0);
}

test('sample, keyword filtering, click and drag selection, bulk restore and persistence', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await sampleSet(page);
  await page.locator('#b-curate').click();
  await expect(page.locator('#in-count')).toHaveText('255');
  await page.locator('.fchip[data-word="asap rocky"]').click();
  await expect(page.locator('#in-count')).toHaveText('47');
  await page.locator('#in-tiles .tile:visible').first().click();
  await expect(page.locator('#out-count')).toHaveText('1');
  await page.locator('#out-tiles .tile:visible').first().dragTo(page.locator('#in-bucket'));
  await expect(page.locator('#out-count')).toHaveText('0');
  await page.locator('#in-all').click();
  await expect(page.locator('#in-count')).toHaveText('0');
  await expect(page.locator('#out-count')).toHaveText('47');
  await page.locator('#out-all').click();
  await page.locator('#in-tiles .tile:visible').first().click();
  await page.reload();
  await page.locator('#b-curate').click();
  await expect(page.locator('#in-count')).toHaveText('254');
  await expect(page.locator('#out-count')).toHaveText('1');
  expect(errors).toEqual([]);
});

