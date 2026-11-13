export function emptyMask(resolution = 1, profile = 'wide') {
  const cols = (profile === 'wide' ? 16 : 9) * resolution;
  const rows = (profile === 'wide' ? 9 : 16) * resolution;
  return { resolution, cells: '0'.repeat(cols * rows) };
}

export function defaultScene() {
  return {
    enabled: false,
    overlap: 0.25,
    minSize: 12,
    wide: emptyMask(),
    narrow: emptyMask(1, 'narrow'),
  };
}

export function normalizeScene(value) {
  const scene = defaultScene();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return scene;
  scene.enabled = value.enabled === true;
  for (const [key, min, max] of [
    ['overlap', 0, 0.5],
    ['minSize', 6, 35],
  ]) {
    if (typeof value[key] === 'number' && Number.isFinite(value[key]))
      scene[key] = Math.min(max, Math.max(min, value[key]));
  }
  for (const profile of ['wide', 'narrow']) {
    const mask = value[profile];
    const clean = emptyMask(mask?.resolution === 2 ? 2 : 1, profile);
    if (
      typeof mask?.cells === 'string' &&
      mask.cells.length === clean.cells.length &&
      /^[01]+$/.test(mask.cells)
    )
      clean.cells = mask.cells;
    scene[profile] = clean;
  }
  return scene;
}

export function gridSize(mask, profile) {
  return {
    cols: (profile === 'wide' ? 16 : 9) * mask.resolution,
    rows: (profile === 'wide' ? 9 : 16) * mask.resolution,
  };
}

export const profileFor = (width, height) => (width >= height ? 'wide' : 'narrow');

export function resampleMask(mask, from, to, resolution = mask.resolution) {
  const result = emptyMask(resolution, to);
  const source = gridSize(mask, from);
  const target = gridSize(result, to);
  result.cells = Array.from(result.cells, (_, i) => {
    const x = i % target.cols;
    const y = Math.floor(i / target.cols);
    const left = Math.floor((x * source.cols) / target.cols);
    const right = Math.ceil(((x + 1) * source.cols) / target.cols);
    const top = Math.floor((y * source.rows) / target.rows);
    const bottom = Math.ceil(((y + 1) * source.rows) / target.rows);
    for (let row = top; row < bottom; row++)
      for (let col = left; col < right; col++)
        if (mask.cells[row * source.cols + col] === '1') return '1';
    return '0';
  }).join('');
  return result;
}

export function presetMask(mask, profile, preset) {
  const { cols, rows } = gridSize(mask, profile);
  return {
    ...mask,
    cells: Array.from(mask.cells, (_, i) => {
      const x = ((i % cols) + 0.5) / cols;
      const y = (Math.floor(i / cols) + 0.5) / rows;
      let blocked = false;
      if (preset === 'center') blocked = Math.abs(x - 0.5) < 0.23 && Math.abs(y - 0.5) < 0.3;
      if (preset === 'triangle')
        blocked = y > 0.15 && y < 0.85 && Math.abs(x - 0.5) < (y - 0.15) * 0.55;
      if (preset === 'sides') blocked = x > 0.25 && x < 0.75;
      if (preset === 'frame') blocked = x > 0.18 && x < 0.82 && y > 0.18 && y < 0.82;
      if (preset === 'block') blocked = true;
      if (preset === 'invert') blocked = mask.cells[i] === '0';
      return blocked ? '1' : '0';
    }).join(''),
  };
}

export function freeRectangles(mask, profile, width, height) {
  const { cols, rows } = gridSize(mask, profile);
  const rectangles = [];
  const clearRow = (row, start, end) => {
    if (row < 0 || row >= rows) return false;
    for (let x = start; x < end; x++) if (mask.cells[row * cols + x] === '1') return false;
    return true;
  };
  for (let top = 0; top < rows; top++) {
    const clear = new Uint8Array(cols).fill(1);
    for (let bottom = top; bottom < rows; bottom++) {
      for (let x = 0; x < cols; x++) if (mask.cells[bottom * cols + x] === '1') clear[x] = 0;
      for (let x = 0; x < cols; ) {
        if (!clear[x]) {
          x++;
          continue;
        }
        const start = x;
        while (x < cols && clear[x]) x++;
        if (clearRow(top - 1, start, x) || clearRow(bottom + 1, start, x)) continue;
        rectangles.push({
          left: (start * width) / cols,
          top: (top * height) / rows,
          right: (x * width) / cols,
          bottom: ((bottom + 1) * height) / rows,
        });
      }
    }
  }
  return rectangles;
}

export const itemAspect = (item) => Math.max(0.3, Math.min(3, item.w / item.h || 1));
export const peakScale = (mode, bounce) =>
  Math.ceil(
    (1 + Math.max(0, Math.min(10, bounce)) * 0.009 * (mode === 'single' ? 1 : 1.4)) * 10000,
  ) / 10000;

export function createPlanner(
  scene,
  width,
  height,
  mode = 'collage',
  bounce = 0,
  profile = profileFor(width, height),
) {
  const mask = scene[profile];
  const { cols, rows } = gridSize(mask, profile);
  const rectangles = freeRectangles(mask, profile, width, height);
  const tolerance = Math.min(width / cols, height / rows) * scene.overlap;
  const scale = peakScale(mode, bounce);
  const minimum = (Math.min(width, height) * scene.minSize) / 100;
  const cache = new Map();

  function regions(aspect, h, angle) {
    const radians = (Math.abs(angle) * Math.PI) / 180;
    const halfW = ((h * aspect * Math.cos(radians) + h * Math.sin(radians)) * scale) / 2;
    const halfH = ((h * Math.cos(radians) + h * aspect * Math.sin(radians)) * scale) / 2;
    const coreW = Math.max(0, halfW - tolerance);
    const coreH = Math.max(0, halfH - tolerance);
    return rectangles
      .map((rect) => ({
        left: Math.max(halfW, rect.left + coreW),
        right: Math.min(width - halfW, rect.right - coreW),
        top: Math.max(halfH, rect.top + coreH),
        bottom: Math.min(height - halfH, rect.bottom - coreH),
      }))
      .filter((rect) => rect.right >= rect.left && rect.bottom >= rect.top);
  }

  function plan(item) {
    const aspect = itemAspect(item);
    const key = `${aspect}:${!!item.sticker}`;
    if (cache.has(key)) return cache.get(key);
    const normal = Math.min(width, height) * 0.3 * (item.sticker ? 1.1 : 1);
    const limit =
      mode === 'single'
        ? Math.min(height, width / aspect)
        : Math.min(
            Math.min(width, height) * 0.52 * (item.sticker ? 1.1 : 1),
            (width * 0.62) / aspect,
          );
    const options = [];
    for (const angle of mode === 'single' ? [0] : [-9, -4.5, 0, 4.5, 9]) {
      if (limit < minimum || !regions(aspect, minimum, angle).length) continue;
      let low = minimum,
        high = limit;
      if (regions(aspect, high, angle).length) low = high;
      else
        for (let i = 0; i < 16; i++) {
          const mid = (low + high) / 2;
          if (regions(aspect, mid, angle).length) low = mid;
          else high = mid;
        }
      options.push({ angle, maxHeight: low });
    }
    const result = {
      aspect,
      options,
      fits: options.length > 0,
      smaller: options.length > 0 && Math.max(...options.map((x) => x.maxHeight)) < normal - 0.1,
    };
    cache.set(key, result);
    return result;
  }

  function place(item, random = Math.random, recent = []) {
    const result = plan(item);
    if (!result.fits) return null;
    const option =
      result.options[
        Math.min(result.options.length - 1, Math.floor(random() * result.options.length))
      ];
    const h =
      mode === 'single'
        ? option.maxHeight
        : Math.max(minimum, option.maxHeight * 0.65) +
          random() * (option.maxHeight - Math.max(minimum, option.maxHeight * 0.65));
    const areas = regions(result.aspect, h, option.angle);
    if (!areas.length) return null;
    const weights = areas.map((r) => Math.max(1, (r.right - r.left) * (r.bottom - r.top)));
    const total = weights.reduce((a, b) => a + b, 0);
    let best = null,
      score = -1;
    for (let attempt = 0; attempt < (recent.length ? 6 : 1); attempt++) {
      let value = random() * total;
      let index = 0;
      while (index < areas.length - 1 && (value -= weights[index]) > 0) index++;
      const area = areas[index];
      const cx = area.left + random() * (area.right - area.left);
      const cy = area.top + random() * (area.bottom - area.top);
      const distance = recent.length
        ? Math.min(...recent.map((p) => (cx - p.x) ** 2 + (cy - p.y) ** 2))
        : 0;
      if (distance > score) {
        score = distance;
        best = {
          x: cx - (h * result.aspect) / 2,
          y: cy - h / 2,
          w: h * result.aspect,
          h,
          angle: option.angle,
          scale,
          regions: areas,
        };
      }
    }
    return best;
  }

  function assess(items) {
    let invalid = 0,
      smaller = 0;
    for (const item of items) {
      const result = plan(item);
      if (!result.fits) invalid++;
      else if (result.smaller) smaller++;
    }
    return { total: items.length, invalid, smaller, empty: !rectangles.length };
  }
  return { plan, place, regions, assess, width, height, profile, scale, minimum };
}

export function assessmentMessage(result) {
  if (result.empty) return 'No room for animations. Restore some cells.';
  if (!result.total) return 'Load a set to check animation sizes. Only the mask has been checked.';
  if (result.invalid)
    return `${result.invalid} of ${result.total} animations do not fit. Lower the minimum height or restore more cells.`;
  if (result.smaller)
    return `All ${result.total} animations fit. ${result.smaller} will be smaller to avoid blocked cells.`;
  return `All ${result.total} animations fit in this layout.`;
}
