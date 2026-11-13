import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { starter, starterUrl, mockStarter, mockBanks, sampleEntry } from './bank-fixtures.js';

const image =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="orange"/></svg>';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jUeYAAAAASUVORK5CYII=',
  'base64',
);
const file = (value) => ({
  name: 'configuration.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(value)),
});

test.beforeEach(async ({ page }) => {
  await mockBanks(page);
  await mockStarter(page, starter);
  await page.route(/https:\/\/media\d*\.giphy\.com\//, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: image }),
  );
  await page.goto('');
  await expect(page.locator('#status')).toContainText('330 animations');
});

async function downloadConfiguration(page) {
  const pending = page.waitForEvent('download');
  await page.locator('#config-export').click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-gifbit-configuration\.json$/);
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}

async function importConfiguration(page, value) {
  const loaded = page.waitForEvent('domcontentloaded');
  await page.locator('#config-file').setInputFiles(file(value));
  await loaded;
  await expect(page.locator('#config-status')).toContainText('Configuration imported');
}

test('a downloaded configuration restores the complete setup and selected set into an empty browser', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page
    .locator('#sets-file')
    .setInputFiles(file({ ...starter, name: 'My show', items: starter.items.slice(0, 3) }));
  await expect(page.locator('.setrow')).toHaveCount(2);
  await page.locator('label[for="source-words"]').click();
  await page.locator('#key').fill('configuration-test-key');
  await page.locator('#words').fill('custom, neon');
  await page.locator('label[for="source-set"]').click();
  await page.locator('#bpm').fill('133.5');
  await page.locator('#bg').evaluate((el) => {
    el.value = '#223344';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page
    .locator('#bgfile')
    .setInputFiles({ name: 'background.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#bgclear')).toBeVisible();
  await page.locator('#b-curate').click();
  await page.locator('#in-tiles .tile').first().click();
  await page.locator('#cur-done').click();
  await page.locator('#banks-open').click();
  await page.locator('.bank-favorite').first().click();
  await page.locator('#banks-close').click();
  await page.locator('#scene-open').click();
  await page.locator('#scene-preset').selectOption('triangle');
  await page.locator('#scene-copy').click();
  await page.locator('#scene-apply').click();
  await page.locator('#go-nomic').click();
  await expect(page.locator('#setup')).toBeHidden();
  await page.keyboard.press('k');
  await page.locator('#t-dots button[title="Blue"]').click();
  await page.keyboard.press('k');
  await page.keyboard.press('s');
  const exported = await downloadConfiguration(page);
  expect(exported.gifbit).toBe('configuration');
  expect(exported.settings).toMatchObject({
    key: 'configuration-test-key',
    bpm: 133.5,
    bg: '#223344',
    tintOn: true,
  });
  expect(exported.settings.bgImg).toMatch(/^data:image\/png;base64,/);
  expect(exported.settings.scene.enabled).toBe(true);
  expect(exported.settings.scene.wide.cells).toContain('1');
  expect(exported.settings.scene.narrow.cells).toContain('1');
  expect(exported.sets).toHaveLength(2);
  expect(exported.excluded).toEqual([starter.items[0].id]);
  expect(exported.favorites).toEqual([sampleEntry.path]);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.setrow')).toHaveCount(1);
  await importConfiguration(page, exported);
  await expect(page.locator('.setrow')).toHaveCount(2);
  await expect(
    page.locator(`input[name="setpick"][value="${exported.settings.setId}"]`),
  ).toBeChecked();
  await expect(page.locator('#status')).toContainText('on screen 2, put aside 1');
  await expect(page.locator('#bgimg')).toHaveCSS('background-image', /data:image\/png;base64/);
  await expect(page.locator('#layer')).toHaveClass('tinted');
  const restored = await downloadConfiguration(page);
  expect({ ...restored, exportedAt: '' }).toEqual({ ...exported, exportedAt: '' });
  await page.locator('#banks-open').click();
  await expect(page.locator('.bank-favorite').first()).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#banks-close').click();
  await page.locator('#go-nomic').click();
  await expect(page.locator('#setup')).toBeHidden();
  await expect
    .poll(async () => {
      await page.keyboard.press('Space');
      return page.locator('#layer .g').count();
    })
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('invalid files and a bank export leave all existing data unchanged and allow a later valid import', async ({
  page,
}) => {
  const valid = await downloadConfiguration(page);
  const before = await page.evaluate(() => ({ ...localStorage }));
  for (const value of [
    starter,
    { ...valid, version: 99 },
    {
      ...valid,
      settings: {
        ...valid.settings,
        scene: { enabled: true, wide: { cells: '1', resolution: 1 } },
      },
    },
  ]) {
    await page.locator('#config-file').setInputFiles(file(value));
    await expect(page.locator('#config-status')).toHaveClass(/err/);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  }
  await page.locator('#config-file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.locator('#config-status')).toContainText('not valid JSON');
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  await importConfiguration(page, valid);
});

test('storage failure rolls back a partly written import without changing the current UI', async ({
  page,
}) => {
  const value = await downloadConfiguration(page);
  value.settings.bg = '#abcdef';
  value.settings.max = 9;
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    let failed = false;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'gifbit.sets' && !failed) {
        failed = true;
        throw new DOMException('Full', 'QuotaExceededError');
      }
      return write.call(this, key, value);
    };
  });
  await page.locator('#config-file').setInputFiles(file(value));
  await expect(page.locator('#config-status')).toContainText('previous configuration was kept');
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  await expect(page.locator('#bg')).not.toHaveValue('#abcdef');
  await importConfiguration(page, value);
  await expect(page.locator('#bg')).toHaveValue('#abcdef');
});

test('import during a pending starter download restores keyword settings without fetching or selecting a bank', async ({
  page,
}) => {
  const value = await downloadConfiguration(page);
  value.settings.source = 'words';
  value.settings.setId = '';
  value.settings.key = 'restored-key';
  value.settings.words = 'restored keywords';
  value.sets = [];
  let downloads = 0;
  await page.route(starterUrl, () => {
    downloads++;
  });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#go-nomic')).toBeDisabled();
  await importConfiguration(page, value);
  await expect(page.locator('#source-words')).toBeChecked();
  await expect(page.locator('#key')).toHaveValue('restored-key');
  await expect(page.locator('#words')).toHaveValue('restored keywords');
  await expect(page.locator('.setrow')).toHaveCount(0);
  await expect(page.locator('#go-nomic')).toBeEnabled();
  expect(downloads).toBe(1);
});

test('an imported mask that cannot fit is preserved and can be repaired before starting', async ({
  page,
}) => {
  const value = await downloadConfiguration(page);
  value.settings.scene.enabled = true;
  value.settings.scene.wide.cells = '1'.repeat(144);
  await importConfiguration(page, value);
  await page.locator('#go-nomic').click();
  await expect(page.locator('#err')).toContainText('No room');
  await page.locator('#scene-open').click();
  await expect(page.locator('#scene-grid .blocked')).toHaveCount(144);
  await expect(page.locator('#scene-apply')).toBeDisabled();
  await page.locator('#scene-clear').click();
  await page.locator('#scene-apply').click();
  await page.locator('#go-nomic').click();
  await expect(page.locator('#setup')).toBeHidden();
});
