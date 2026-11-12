import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const samplePath = fileURLToPath(new URL('../data/sample.json', import.meta.url));
const sample = JSON.parse(await readFile(samplePath));
const image =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#ff6b3d"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/media\d*\.giphy\.com\//, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: image }),
  );
  await page.goto('');
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

test('JSON import, merge, save, update, export and confirmed deletion', async ({ page }) => {
  await page.locator('label[for="source-set"]').click();
  await page.locator('#sets-file').setInputFiles(samplePath);
  await expect(page.locator('.setrow')).toHaveCount(1);
  await page.locator('#b-curate').click();
  await page.locator('#in-tiles .tile').first().click();
  await page.locator('#add-btn').click();
  await page.locator('#add-menu button[data-id]').first().click();
  await expect(page.locator('#in-count')).toHaveText('255');
  await page.locator('#setname').fill('Stage mix');
  await page.locator('#saveset button').click();
  await page.locator('#in-tiles .tile').first().click();
  await page.locator('#saveset button').click();
  await page.locator('#cur-done').click();
  await expect(page.locator('.setrow')).toHaveCount(2);
  const downloaded = page.waitForEvent('download');
  await page.locator('#sets-exportall').click();
  const download = await downloaded;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported.gifbit).toBe(1);
  expect(exported.sets.map((set) => set.items.length)).toEqual([255, 254]);
  const remove = page.locator('.setrow').last().locator('[data-act="delete"]');
  await remove.click();
  await expect(remove).toHaveText('Sure?');
  await remove.click();
  await expect(page.locator('.setrow')).toHaveCount(1);
});

test('manual playback, collage limit, single mode, colors, background and shortcuts', async ({
  page,
}) => {
  await sampleSet(page);
  await manualStart(page);
  for (let i = 0; i < 9; i++) await page.keyboard.press('Space');
  expect(await page.locator('#layer .g').count()).toBeLessThanOrEqual(5);
  await page.keyboard.press('k');
  await expect(page.locator('#tint')).toBeVisible();
  await page.locator('#t-dots button[title="Blue"]').click();
  await expect(page.locator('#layer')).toHaveClass('tinted');
  await page.locator('#a-on').check();
  await expect(page.locator('#b-tint')).toHaveText('Color: auto');
  await page.locator('label[for="a-mode-beats"]').click();
  await expect(page.locator('#a-beatrow')).toBeVisible();
  await page.locator('#t-sec-bg summary').click();
  await page.locator('#t-bgc').evaluate((el) => {
    el.value = '#223344';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#stage')).toHaveCSS('background-color', 'rgb(34, 51, 68)');
  await page.keyboard.press('k');
  await expect(page.locator('#tint')).toBeHidden();
  await page.keyboard.press('h');
  await expect(page.locator('#hud')).toBeVisible();
  await page.keyboard.press('c');
  await expect(page.locator('#layer .g')).toHaveCount(0);
  await page.keyboard.press('s');
  await page.locator('label[for="mode-single"]').click();
  await expect(page.locator('#maxfield')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect
    .poll(async () => {
      await page.keyboard.press('Space');
      return page.locator('#layer .single').count();
    })
    .toBe(1);
  await page.keyboard.press('Space');
  await expect(page.locator('#layer .g')).toHaveCount(1);
});

test('sequential playback keeps source order when image decoding finishes out of order', async ({
  page,
}) => {
  const smallSet = { ...sample, items: sample.items.slice(0, 3) };
  await page.locator('label[for="source-set"]').click();
  await page
    .locator('#sets-file')
    .setInputFiles({
      name: 'order.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(smallSet)),
    });
  await page.locator('label[for="order-seq"]').click();
  await page.locator('label[for="mode-single"]').click();
  await page.route(smallSet.items[0].big, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ contentType: 'image/svg+xml', body: image });
  });
  await manualStart(page);
  await expect(page.locator('#layer img')).toHaveAttribute('src', smallSet.items[0].big);
  await page.keyboard.press('Space');
  await expect(page.locator('#layer img')).toHaveAttribute('src', smallSet.items[1].big);
  await page.keyboard.press('Space');
  await expect(page.locator('#layer img')).toHaveAttribute('src', smallSet.items[2].big);
});

test('Giphy search preserves keywords, both types, ratings and error recovery', async ({
  page,
}) => {
  const requests = [];
  await page.route('https://api.giphy.com/**', (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    return route.fulfill({
      json: {
        data: [
          {
            id: url.pathname + url.searchParams.get('q'),
            images: { original: { url: sample.items[0].big, width: '480', height: '270' } },
          },
        ],
      },
    });
  });
  await page.locator('#key').fill('test-key');
  await page.locator('#words').fill('Dance, dance; wow');
  await page.locator('label[for="type-both"]').click();
  await page.locator('#b-curate').click();
  await expect(page.locator('#in-count')).toHaveText('4');
  expect(requests.length).toBe(4);
  expect(requests.every((url) => url.searchParams.get('rating') === 'pg-13')).toBe(true);
  await page.locator('#cur-done').click();
  await page.unroute('https://api.giphy.com/**');
  await page.route('https://api.giphy.com/**', (route) => route.fulfill({ status: 429, json: {} }));
  await page.locator('#words').fill('different');
  await page.locator('#b-curate').click();
  await expect(page.locator('#err')).toContainText('request limit');
  await expect(page.locator('#b-curate')).toBeEnabled();
});

test('microphone worklet and latency calibration run with a synthetic audio device', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await sampleSet(page);
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
  await expect.poll(() => page.evaluate(() => window.workletNodes)).toBe(1);
  await expect(page.locator('#cal')).toBeVisible();
  await expect(page.locator('#microw')).toBeVisible();
  await page.locator('#cal-done').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#cal-leadv')).toHaveText('85 ms');
  await page.locator('#cal-done').click();
  await page.locator('#go').click();
  await expect(page.locator('#setup')).toBeHidden();
  expect(errors).toEqual([]);
});

test('mobile settings and curator remain usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sampleSet(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#b-curate').click();
  await expect(page.locator('#in-count')).toHaveText('255');
  const bucket = await page.locator('#out-bucket').boundingBox();
  expect(bucket.y + bucket.height).toBeLessThanOrEqual(845);
  expect(bucket.height).toBeGreaterThan(90);
});

test('malformed storage recovers and malformed files report an error', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'gifbit.v1',
      JSON.stringify({ words: null, autoCols: null, mode: 'invalid' }),
    );
    localStorage.setItem('gifbit.sets', '[null, {"name":"broken"}]');
    localStorage.setItem('gifbit.excluded', '{broken');
  });
  await page.reload();
  await expect(page.locator('#source-words')).toBeChecked();
  await page.locator('label[for="source-set"]').click();
  await page
    .locator('#sets-file')
    .setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{broken'),
    });
  await expect(page.locator('#toast')).toContainText("doesn't look like");
  await expect(page.locator('.setrow')).toHaveCount(0);
});
