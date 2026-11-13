import { test, expect } from '@playwright/test';
import { starter, mockStarter } from './bank-fixtures.js';

const image =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#ff6b3d"/><circle cx="160" cy="120" r="70" fill="#342c41"/></svg>';

test.beforeEach(async ({ page }) => {
  await mockStarter(page, starter);
  await page.route(/https:\/\/media\d*\.giphy\.com\//, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: image }),
  );
  await page.goto('');
  await expect(page.locator('#status')).toContainText('330 animations');
});

async function setRange(page, id, value) {
  await page.locator(id).evaluate((el, next) => {
    el.value = next;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
}

async function configure(page, preset = 'triangle') {
  await page.locator('#scene-open').click();
  await page.locator('#scene-enabled').check();
  await setRange(page, '#scene-min', 6);
  await setRange(page, '#scene-overlap', 0);
  await page.locator('#scene-preset').selectOption(preset);
}

async function start(page) {
  await page.locator('#go-nomic').click();
  await expect(page.locator('#setup')).toBeHidden();
  await page.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : undefined));
  await expect
    .poll(async () => {
      await page.keyboard.press('Space');
      return page.locator('#layer .g').count();
    })
    .toBeGreaterThan(0);
}

async function expectClearMask(page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(localStorage.getItem('gifbit.v1'));
        const stage = document.querySelector('#stage');
        const W = stage.clientWidth,
          H = stage.clientHeight;
        const profile = W >= H ? 'wide' : 'narrow';
        const mask = saved.scene[profile];
        const cols = (profile === 'wide' ? 16 : 9) * mask.resolution;
        const rows = (profile === 'wide' ? 9 : 16) * mask.resolution;
        let bad = 0;
        for (const node of document.querySelectorAll('#layer .g')) {
          const w = parseFloat(node.style.width),
            h = parseFloat(node.style.height);
          const radians = (Math.abs(parseFloat(node.style.rotate)) * Math.PI) / 180;
          const scale = 1 + saved.bounce * 0.009 * (saved.mode === 'single' ? 1 : 1.4);
          const bw = (w * Math.cos(radians) + h * Math.sin(radians)) * scale;
          const bh = (h * Math.cos(radians) + w * Math.sin(radians)) * scale;
          const left = parseFloat(node.style.left) + w / 2 - bw / 2;
          const top = parseFloat(node.style.top) + h / 2 - bh / 2;
          if (![w, h, left, top].every(Number.isFinite)) {
            bad++;
            continue;
          }
          for (let row = 0; row < rows; row++)
            for (let col = 0; col < cols; col++) {
              if (mask.cells[row * cols + col] !== '1') continue;
              if (
                Math.min(left + bw, ((col + 1) * W) / cols) - Math.max(left, (col * W) / cols) >
                  0.01 &&
                Math.min(top + bh, ((row + 1) * H) / rows) - Math.max(top, (row * H) / rows) > 0.01
              )
                bad++;
            }
        }
        return bad;
      }),
    )
    .toBe(0);
}

test('scene editor paints, undoes, validates both masks, cancels and persists', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await configure(page);
  await expect(page.locator('#scene-status')).toContainText('All 330 animations fit');
  await page.locator('#scene-resolution').selectOption('2');
  await expect(page.locator('#scene-grid [role="gridcell"]')).toHaveCount(576);
  const count = await page.locator('#scene-grid .blocked').count();
  await page.locator('#scene-clear').click();
  await expect(page.locator('#scene-grid .blocked')).toHaveCount(0);
  await page.locator('#scene-undo').click();
  await expect(page.locator('#scene-grid .blocked')).toHaveCount(count);
  await page.locator('#scene-block-all').click();
  await expect(page.locator('#scene-apply')).toBeDisabled();
  await expect(page.locator('#scene-status')).toContainText('No room');
  await page.locator('#scene-undo').click();
  await page.locator('#scene-copy').click();
  await expect(page.locator('#scene-narrow')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#scene-apply').click();
  await page.reload();
  await page.locator('#scene-open').click();
  await expect(page.locator('#scene-enabled')).toBeChecked();
  await expect(page.locator('#scene-resolution')).toHaveValue('2');
  await expect(page.locator('#scene-grid .blocked')).toHaveCount(count);
  await page.locator('#scene-clear').click();
  const first = page.locator('#scene-grid [role="gridcell"]').first();
  await first.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('#scene-grid .blocked')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('#scene-layout')).not.toBeVisible();
  await page.locator('#scene-open').click();
  await expect(page.locator('#scene-grid .blocked')).toHaveCount(count);
  expect(errors).toEqual([]);
});

test('masked playback respects maximum bounce and reflows into the narrow profile', async ({
  page,
}) => {
  await configure(page);
  await page.locator('#scene-copy').click();
  await page.locator('#scene-apply').click();
  await setRange(page, '#bounce', 10);
  await start(page);
  for (let i = 0; i < 18; i++) await page.keyboard.press('Space');
  await expectClearMask(page);
  await expect(page.locator('#layer')).toHaveCSS('transform', 'none');
  await page.setViewportSize({ width: 500, height: 900 });
  await expect(page.locator('#scene-summary')).toContainText('Narrow');
  await expectClearMask(page);
  await page.keyboard.press('s');
  await page.locator('label[for="mode-single"]').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Space');
  await expect(page.locator('#layer .g')).toHaveCount(1);
  await expect(page.locator('#layer .g')).toHaveClass(/scene-single/);
  await expectClearMask(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.keyboard.press('Space');
  await expect(page.locator('#layer .g')).toHaveCSS('transform', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expectClearMask(page);
});

test('invalid saved layout stops playback and can be disabled without losing the mask', async ({
  page,
}) => {
  await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('gifbit.v1'));
    value.scene = {
      enabled: true,
      minSize: 35,
      overlap: 0,
      wide: { resolution: 1, cells: '1'.repeat(144) },
    };
    localStorage.setItem('gifbit.v1', JSON.stringify(value));
  });
  await page.reload();
  await expect(page.locator('#status')).toContainText('330 animations');
  await page.locator('#go-nomic').click();
  await expect(page.locator('#err')).toContainText('No room');
  await expect(page.locator('#setup')).toBeVisible();
  await page.locator('#scene-open').click();
  await expect(page.locator('#scene-apply')).toBeDisabled();
  await page.locator('#scene-enabled').uncheck();
  await page.locator('#scene-apply').click();
  await start(page);
  await page.keyboard.press('s');
  await page.locator('#scene-open').click();
  await expect(page.locator('#scene-grid .blocked')).toHaveCount(144);
});

test('editor fits a phone, supports pointer painting and shows a real-size preview', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#scene-open').click();
  await expect(page.locator('#scene-narrow')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#scene-enabled')).toBeInViewport();
  await expect(page.locator('#scene-apply')).toBeInViewport();
  const first = await page.locator('#scene-grid [role="gridcell"]').nth(0).boundingBox();
  const last = await page.locator('#scene-grid [role="gridcell"]').nth(8).boundingBox();
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  await page.mouse.move(last.x + last.width / 2, last.y + last.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#scene-grid .blocked')).toHaveCount(9);
  await page.locator('#scene-view').selectOption('window');
  const board = await page.locator('#scene-board').boundingBox();
  expect(Math.abs(board.width / board.height - 390 / 844)).toBeLessThan(0.01);
  expect(
    await page.locator('#scene-layout').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('scene-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('#scene-wide')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#scene-wide').click();
  await page.locator('#scene-view').selectOption('reference');
  await page.locator('#scene-preset').selectOption('triangle');
  await page.locator('#scene-layout').evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: testInfo.outputPath('scene-desktop.png') });
});

test('a resize that makes placement impossible pauses the scene and recovers without skipping the set', async ({
  page,
}) => {
  await page.locator('#sets-file').setInputFiles({
    name: 'square.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...starter,
        name: 'Square',
        items: [{ ...starter.items[0], w: 100, h: 100 }],
      }),
    ),
  });
  await setRange(page, '#bounce', 10);
  await page.locator('#scene-open').click();
  await page.locator('#scene-enabled').check();
  await setRange(page, '#scene-overlap', 0);
  await page.locator('#scene-block-all').click();
  await page.locator('#scene-allow').click();
  for (let col = 0; col < 2; col++) {
    const first = await page.locator('#scene-grid [role="gridcell"]').nth(col).boundingBox();
    const last = await page
      .locator('#scene-grid [role="gridcell"]')
      .nth(128 + col)
      .boundingBox();
    await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
    await page.mouse.down();
    await page.mouse.move(last.x + last.width / 2, last.y + last.height / 2, { steps: 8 });
    await page.mouse.up();
  }
  await page.locator('#scene-apply').click();
  await start(page);
  await page.setViewportSize({ width: 1000, height: 1000 });
  await expect(page.locator('#scene-warning')).toBeVisible();
  await expect(page.locator('#scene-warning')).toContainText('1 of 1 animations do not fit');
  await page.keyboard.press('Space');
  await expect(page.locator('#layer .g')).toHaveCount(0);
  await page.setViewportSize({ width: 1600, height: 900 });
  await expect(page.locator('#scene-warning')).toBeHidden();
  await page.keyboard.press('Space');
  await expect(page.locator('#layer .g')).toHaveCount(1);
  await expectClearMask(page);
});
