import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { apiRoot, sample, sampleEntry } from './bank-fixtures.js';

const other = { ...sampleEntry, path: 'gif-banks/2026-11-12-night.json', sha: 'b'.repeat(40) };
const night = {
  ...sample,
  name: 'Night lights',
  description: 'Neon streets and dancing.',
  items: sample.items.slice(0, 3),
};
const image =
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="#793c91"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/media\d*\.giphy\.com\//, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: image }),
  );
});

test('banks load on demand, remember bank favorites and metadata, and import selected GIFs', async ({
  page,
}) => {
  const blobs = [];
  await page.route(`${apiRoot}/git/trees/**`, (route) =>
    route.fulfill({ json: { tree: [sampleEntry, other] } }),
  );
  await page.route(`${apiRoot}/git/blobs/**`, (route) => {
    blobs.push(route.request().url());
    return route.fulfill({ json: route.request().url().endsWith(other.sha) ? night : sample });
  });
  await page.goto('');
  expect(blobs).toEqual([]);
  await page.locator('#banks-open').click();
  await expect(page.locator('.bank-open')).toHaveCount(2);
  await expect(page.locator('.bank-open').first()).toContainText('2026-11-12-night');
  expect(blobs).toEqual([]);
  await page.locator('.bank-favorite').first().click();
  await page.locator('#banks-favorites').check();
  await expect(page.locator('.bank-open')).toHaveCount(1);
  expect(blobs).toEqual([]);
  await page.locator('.bank-open').click();
  await expect(page.locator('#bank-name')).toHaveText(night.name);
  await expect(page.locator('.bank-open')).toContainText(night.description);
  await expect(page.locator('#bank-tiles img')).toHaveCount(3);
  await page.locator('#bank-select-none').click();
  await expect(page.locator('#bank-import')).toBeDisabled();
  await page.locator('#bank-tiles input').first().check();
  await page.locator('#bank-import').click();
  await expect(page.locator('#banks')).not.toBeVisible();
  await expect(page.locator('.setrow')).toContainText(night.name);
  await expect(page.locator('.setrow')).toContainText(night.description);
  const sets = await page.evaluate(() => JSON.parse(localStorage.getItem('gifbit.sets')));
  expect(sets[0].items).toHaveLength(1);
  await page.reload();
  await page.locator('#banks-open').click();
  await page.locator('#banks-favorites').check();
  await expect(page.locator('.bank-open')).toContainText(night.name);
  await expect(page.locator('.bank-open')).toContainText(night.description);
  expect(blobs).toHaveLength(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#banks')).not.toBeVisible();
  await expect(page.locator('#banks-open')).toBeFocused();
});

test('export edits name and description and uses a dated filename that round-trips', async ({
  page,
}) => {
  await page.goto('');
  await page.locator('label[for="source-set"]').click();
  await page.locator('#sets-file').setInputFiles({
    name: 'legacy-bank.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ items: night.items })),
  });
  await expect(page.locator('.setrow')).toContainText('legacy-bank');
  await page.locator('[data-act="export"]').click();
  await page.locator('#bank-export-name').fill('Światła miasta');
  await page.locator('#bank-export-description').fill('Nocne animacje\nDo wolnego rytmu.');
  const pending = page.waitForEvent('download');
  await page.locator('#bank-export-download').click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-swiatla-miasta\.json$/);
  const value = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(value.name).toBe('Światła miasta');
  expect(value.description).toBe('Nocne animacje\nDo wolnego rytmu.');
  expect(value.items).toHaveLength(3);
  await page.reload();
  await page.locator('[data-act="export"]').click();
  await expect(page.locator('#bank-export-description')).toHaveValue(value.description);
  await page.locator('#bank-export-cancel').click();
  await page.locator('#sets-file').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(value)),
  });
  await expect(page.locator('.setrow')).toHaveCount(2);
  await expect(page.locator('.setrow').last()).toContainText(value.description);
});

test('GitHub errors can be retried and invalid banks do not alter saved sets', async ({ page }) => {
  let failList = true,
    failBank = true;
  await page.route(`${apiRoot}/git/trees/**`, (route) =>
    route.fulfill(failList ? { status: 403, json: {} } : { json: { tree: [other] } }),
  );
  await page.route(`${apiRoot}/git/blobs/**`, (route) =>
    route.fulfill(failBank ? { body: '{broken' } : { json: { items: night.items } }),
  );
  await page.goto('');
  await page.locator('#banks-open').click();
  await expect(page.locator('#banks-status')).toContainText('limiting requests');
  failList = false;
  await page.locator('#banks-refresh').click();
  await page.locator('.bank-open').click();
  await expect(page.locator('#banks-status')).toContainText('valid JSON');
  await expect(page.locator('#bank-detail')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('gifbit.sets'))).toBeNull();
  failBank = false;
  await page.locator('.bank-open').click();
  await expect(page.locator('#bank-name')).toHaveText('2026-11-12-night');
  await expect(page.locator('#bank-description')).toBeEmpty();
  await page.locator('#bank-import').click();
  await expect(page.locator('.setrow')).toHaveCount(1);
});

test('late bank downloads cannot replace a newer selection and changed files invalidate metadata', async ({
  page,
}) => {
  let revision = other;
  await page.route(`${apiRoot}/git/trees/**`, (route) =>
    route.fulfill({ json: { tree: [sampleEntry, revision] } }),
  );
  await page.route(`${apiRoot}/git/blobs/**`, async (route) => {
    if (route.request().url().endsWith(sampleEntry.sha)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({ json: sample });
    } else await route.fulfill({ json: night });
  });
  await page.goto('');
  await page.locator('#banks-open').click();
  await page.locator(`.bank-open[data-path="${sampleEntry.path}"]`).click();
  await page.locator(`.bank-open[data-path="${other.path}"]`).click();
  await expect(page.locator('#bank-name')).toHaveText(night.name);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('gifbit.banks.metadata') || '{}')[
            'gif-banks/2026-11-05-hh3.json'
          ]?.name,
      ),
    )
    .toBe(sample.name);
  await expect(page.locator('#bank-name')).toHaveText(night.name);
  revision = { ...other, sha: 'c'.repeat(40) };
  await page.locator('#banks-refresh').click();
  await expect(page.locator('#bank-detail')).toBeHidden();
  await expect(page.locator(`.bank-open[data-path="${other.path}"]`)).toContainText(
    '2026-11-12-night',
  );
});

test('the bank panel stays usable on mobile and treats metadata as plain text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const value = {
    ...night,
    items: sample.items,
    name: '<img src=x onerror=alert(1)>',
    description: 'A description. '.repeat(60),
  };
  await page.route(`${apiRoot}/git/trees/**`, (route) =>
    route.fulfill({ json: { tree: [other] } }),
  );
  await page.route(`${apiRoot}/git/blobs/**`, (route) => route.fulfill({ json: value }));
  await page.goto('');
  await page.locator('#banks-open').click();
  await page.locator('.bank-open').click();
  await expect(page.locator('#bank-name')).toHaveText(value.name);
  await expect(page.locator('#bank-name img')).toHaveCount(0);
  expect((await page.locator('.bank-tile').first().boundingBox()).height).toBeGreaterThan(140);
  expect(
    await page.locator('#bank-tiles').evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  expect(await page.locator('#banks').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  const button = await page.locator('#bank-import').boundingBox();
  expect(button.y + button.height).toBeLessThanOrEqual(844);
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect((await page.locator('.bank-tile').first().boundingBox()).height).toBeGreaterThan(170);
  await page.locator('#bank-import').click();
  await expect(page.locator('.setrow')).toHaveCount(1);
});

test('storage failures keep favorites and imports unchanged and allow retry', async ({ page }) => {
  await page.addInitScript(() => {
    window.blockStorage = true;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (window.blockStorage && ['gifbit.sets', 'gifbit.banks.favorites'].includes(key))
        throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.route(`${apiRoot}/git/trees/**`, (route) =>
    route.fulfill({ json: { tree: [other] } }),
  );
  await page.route(`${apiRoot}/git/blobs/**`, (route) => route.fulfill({ json: night }));
  await page.goto('');
  await page.locator('#banks-open').click();
  await page.locator('.bank-favorite').click();
  await expect(page.locator('#banks-status')).toContainText('Could not save favorites');
  await expect(page.locator('.bank-favorite')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.bank-open').click();
  await page.locator('#bank-import').click();
  await expect(page.locator('#banks-status')).toContainText('Could not save this bank');
  expect(await page.evaluate(() => localStorage.getItem('gifbit.sets'))).toBeNull();
  await page.evaluate(() => {
    window.blockStorage = false;
  });
  await page.locator('#bank-import').click();
  await expect(page.locator('.setrow')).toHaveCount(1);
});

test('repeated clicks share a download and refreshing cancels a pending preview', async ({
  page,
}) => {
  let entries = [other],
    downloads = 0,
    release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(`${apiRoot}/git/trees/**`, (route) =>
    route.fulfill({ json: { tree: entries } }),
  );
  await page.route(`${apiRoot}/git/blobs/**`, async (route) => {
    downloads++;
    await gate;
    await route.fulfill({ json: night });
  });
  await page.goto('');
  await page.locator('#banks-open').click();
  await page.locator('.bank-open').click();
  await page.locator('.bank-open').click();
  await expect.poll(() => downloads).toBe(1);
  entries = [];
  await page.locator('#banks-refresh').click();
  await expect(page.locator('#banks-status')).toContainText('No GIF banks');
  release();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('gifbit.banks.metadata') || '{}')[
            'gif-banks/2026-11-12-night.json'
          ]?.name,
      ),
    )
    .toBe(night.name);
  await expect(page.locator('#bank-detail')).toBeHidden();
  await expect(page.locator('.bank-open')).toHaveCount(0);
  expect(downloads).toBe(1);
});
