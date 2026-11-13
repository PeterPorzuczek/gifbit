import { defaultScene, normalizeScene } from '../scene/geometry.js';
export const defaults = {
  scene: defaultScene(),
  key: '',
  words: 'dance, wow, explosion, neon, money',
  type: 'gifs',
  mode: 'collage',
  max: 5,
  every: 1,
  band: 'bass',
  sens: 6,
  bg: '#140f1c',
  bgImg: '',
  dim: 0,
  safe: true,
  source: 'set',
  setId: '',
  thumb: 240,
  order: 'random',
  bpm: 0,
  limit: 16,
  lead: 80,
  bounce: 5,
  tintOn: false,
  tintM: 100,
  tintH: 220,
  tintS: 70,
  tintB: 100,
  tintC: 100,
  tintBg: false,
  tintPanel: false,
  autoOn: false,
  autoCols: [1, 7, 8],
  autoMode: 'time',
  autoSec: 4,
  autoBeats: 4,
  autoSmooth: 50,
  secAuto: true,
  secBg: false,
};

const choices = {
  type: ['gifs', 'stickers', 'both'],
  mode: ['collage', 'single'],
  every: [1, 2, 4],
  band: ['bass', 'mid', 'full'],
  source: ['words', 'set'],
  order: ['random', 'seq'],
  limit: [4, 8, 16, 32],
  autoMode: ['time', 'beats'],
  autoBeats: [1, 2, 4, 8, 16],
};

const ranges = {
  max: [1, 12],
  sens: [1, 10],
  dim: [0, 80],
  thumb: [140, 440],
  lead: [0, 250],
  bounce: [0, 10],
  tintM: [0, 100],
  tintH: [0, 359],
  tintS: [0, 100],
  tintB: [30, 130],
  tintC: [40, 150],
  autoSec: [0.5, 30],
  autoSmooth: [0, 100],
};

export function normalizeSettings(value) {
  const result = { ...defaults, scene: defaultScene(), autoCols: [...defaults.autoCols] };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [key, initial] of Object.entries(defaults)) {
    if (!Object.hasOwn(value, key)) continue;
    const next = value[key];
    if (key === 'scene') result.scene = normalizeScene(next);
    else if (choices[key]) {
      if (choices[key].includes(next)) result[key] = next;
    } else if (ranges[key]) {
      if (typeof next === 'number' && Number.isFinite(next)) {
        result[key] = Math.min(ranges[key][1], Math.max(ranges[key][0], next));
      }
    } else if (key === 'autoCols') {
      if (Array.isArray(next))
        result[key] = [...new Set(next.filter((n) => Number.isInteger(n) && n >= 0 && n <= 8))];
    } else if (key === 'bpm') {
      if (typeof next === 'number' && next >= 50 && next <= 220) result[key] = next;
    } else if (typeof next === typeof initial) result[key] = next;
  }
  if (!/^#[0-9a-f]{6}$/i.test(result.bg)) result.bg = defaults.bg;
  if (result.bgImg && !/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(result.bgImg))
    result.bgImg = '';
  return result;
}
