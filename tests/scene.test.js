import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultScene,
  normalizeScene,
  presetMask,
  resampleMask,
  gridSize,
  createPlanner,
  freeRectangles,
  profileFor,
} from '../src/scene/geometry.js';

test('scene settings validate masks, clamp numbers and do not share defaults', () => {
  const clean = normalizeScene({
    enabled: 'yes',
    overlap: 12,
    minSize: NaN,
    wide: { resolution: 99, cells: 'broken' },
  });
  assert.equal(clean.enabled, false);
  assert.equal(clean.overlap, 0.5);
  assert.equal(clean.minSize, 12);
  assert.deepEqual(clean.wide, defaultScene().wide);
  clean.wide.cells = '';
  assert.equal(defaultScene().wide.cells.length, 144);
  assert.equal(profileFor(900, 900), 'wide');
  assert.equal(profileFor(899, 900), 'narrow');
});

test('resolution changes preserve blocked areas and profile copying uses normalized coordinates', () => {
  const scene = defaultScene();
  scene.wide.cells = '1' + '0'.repeat(143);
  const fine = resampleMask(scene.wide, 'wide', 'wide', 2);
  assert.equal([...fine.cells].filter((cell) => cell === '1').length, 4);
  assert.deepEqual(resampleMask(fine, 'wide', 'wide', 1), scene.wide);
  const narrow = resampleMask(scene.wide, 'wide', 'narrow');
  assert.equal(narrow.cells[0], '1');
  assert.equal(narrow.cells.at(-1), '0');
});

test('free rectangles cover all and only unblocked cells, including disconnected islands', () => {
  for (const preset of ['clear', 'triangle', 'sides', 'frame', 'block']) {
    const mask = presetMask(defaultScene().wide, 'wide', preset);
    const regions = freeRectangles(mask, 'wide', 1600, 900);
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 16; x++) {
        const inside = regions.some(
          (r) =>
            x * 100 + 50 >= r.left &&
            x * 100 + 50 <= r.right &&
            y * 100 + 50 >= r.top &&
            y * 100 + 50 <= r.bottom,
        );
        assert.equal(inside, mask.cells[y * 16 + x] === '0');
      }
  }
});

function verifyBounds(scene, profile, width, height, p) {
  const angle = (Math.abs(p.angle) * Math.PI) / 180;
  const w = (p.w * Math.cos(angle) + p.h * Math.sin(angle)) * p.scale;
  const h = (p.h * Math.cos(angle) + p.w * Math.sin(angle)) * p.scale;
  const x = p.x + p.w / 2 - w / 2;
  const y = p.y + p.h / 2 - h / 2;
  assert.ok(x >= -0.001 && y >= -0.001 && x + w <= width + 0.001 && y + h <= height + 0.001);
  const { cols, rows } = gridSize(scene[profile], profile);
  const tolerance = Math.min(width / cols, height / rows) * scene.overlap;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      if (scene[profile].cells[row * cols + col] !== '1') continue;
      const overlapW =
        Math.min(x + w - tolerance, ((col + 1) * width) / cols) -
        Math.max(x + tolerance, (col * width) / cols);
      const overlapH =
        Math.min(y + h - tolerance, ((row + 1) * height) / rows) -
        Math.max(y + tolerance, (row * height) / rows);
      assert.ok(
        overlapW < 0.001 || overlapH < 0.001,
        'maximum bounce envelope crosses the protected mask',
      );
    }
}

test('rotated placements respect triangle and frame masks at maximum bounce across viewports', () => {
  let seed = 97;
  const random = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32;
  for (const [width, height] of [
    [1600, 900],
    [400, 800],
    [900, 900],
    [1800, 500],
  ]) {
    const profile = profileFor(width, height);
    for (const overlap of [0, 0.25, 0.5])
      for (const preset of ['triangle', 'frame']) {
        const scene = defaultScene();
        scene.minSize = 6;
        scene.overlap = overlap;
        scene[profile] = presetMask(scene[profile], profile, preset);
        const planner = createPlanner(scene, width, height, 'collage', 10);
        for (const item of [
          { w: 1, h: 1 },
          { w: 3, h: 1 },
          { w: 1, h: 3, sticker: true },
        ]) {
          assert.equal(planner.plan(item).fits, true);
          for (let i = 0; i < 20; i++) {
            const p = planner.place(item, random);
            assert.ok(p);
            assert.ok(p.h >= planner.minimum - 0.001);
            verifyBounds(scene, profile, width, height, p);
          }
        }
      }
  }
});

test('validation rejects fragmented free space and reports incompatible aspect ratios', () => {
  const scene = defaultScene();
  scene.overlap = 0;
  scene.wide.cells = Array.from({ length: 144 }, (_, i) =>
    ((i % 16) + Math.floor(i / 16)) % 2 ? '1' : '0',
  ).join('');
  const item = { w: 1, h: 1 };
  assert.equal(createPlanner(scene, 1600, 900).plan(item).fits, false);
  scene.wide = presetMask(scene.wide, 'wide', 'block');
  assert.equal(createPlanner(scene, 1600, 900).assess([item]).empty, true);
  scene.wide.cells = '0'.repeat(16) + '1'.repeat(128);
  scene.minSize = 6;
  const planner = createPlanner(scene, 1600, 900, 'collage', 10);
  assert.equal(planner.assess([item]).invalid, 0);
  assert.equal(planner.assess([item]).smaller, 1);
});

test('single mode finds a large valid placement and deterministic fitting does not depend on lucky sampling', () => {
  const scene = defaultScene();
  scene.wide = presetMask(scene.wide, 'wide', 'sides');
  scene.overlap = 0;
  const planner = createPlanner(scene, 1600, 900, 'single', 10);
  const item = { w: 1, h: 1 };
  for (const random of [() => 0, () => 0.999999]) {
    const p = planner.place(item, random);
    assert.ok(p && p.h > 300);
    verifyBounds(scene, 'wide', 1600, 900, p);
  }
});
