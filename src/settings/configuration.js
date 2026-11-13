import { normalizeSettings } from './schema.js';
import { unpackItem } from '../library/format.js';

export const restoreKey = 'gifbit.restore';
export const maxConfigurationSize = 50 * 1024 * 1024;
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (message) => {
  throw new Error(message);
};
const sameFields = (value, clean) => {
  if (Array.isArray(clean))
    return (
      Array.isArray(value) &&
      value.length === clean.length &&
      clean.every((entry, i) => sameFields(value[i], entry))
    );
  if (record(clean))
    return (
      record(value) &&
      Object.keys(clean).every(
        (key) => !Object.hasOwn(value, key) || sameFields(value[key], clean[key]),
      )
    );
  return value === clean;
};
const bankPath = (path) =>
  typeof path === 'string' &&
  path.startsWith('gif-banks/') &&
  /\.json$/i.test(path) &&
  !path.includes('\\') &&
  path.split('/').every((part) => part && !part.startsWith('.'));

function stringList(value, name, accepts = () => true) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !accepts(entry)))
    fail(`Invalid ${name} in the configuration file.`);
  return [...value];
}

export function readConfiguration(value) {
  if (!record(value) || value.gifbit !== 'configuration')
    fail('Choose a GIFbit configuration export. GIF banks belong in Saved set → Import from file.');
  if (value.version !== 1)
    fail('This configuration version is not supported. Update GIFbit first.');
  if (!record(value.settings) || !Object.keys(value.settings).length || !Array.isArray(value.sets))
    fail('The configuration is missing its settings or saved sets.');
  const settings = normalizeSettings(value.settings);
  if (!sameFields(value.settings, settings)) fail('The configuration contains invalid settings.');
  const ids = new Set();
  const sets = value.sets.map((set) => {
    if (
      !record(set) ||
      typeof set.id !== 'string' ||
      !/^[a-z0-9_-]{1,100}$/i.test(set.id) ||
      ids.has(set.id) ||
      typeof set.name !== 'string' ||
      !set.name.trim() ||
      set.name.length > 60 ||
      !Array.isArray(set.items) ||
      !set.items.length
    )
      fail('The configuration contains an invalid or duplicate saved set.');
    ids.add(set.id);
    const seen = new Set();
    const items = set.items.map((item) => {
      const clean = unpackItem(item);
      if (!clean || seen.has(clean.id) || !sameFields(item, clean))
        fail(`Saved set “${set.name}” contains an invalid or duplicate animation.`);
      seen.add(clean.id);
      return clean;
    });
    const description = set.description ?? '';
    if (typeof description !== 'string' || description.length > 1000)
      fail(`Saved set “${set.name}” has an invalid description.`);
    const dates = {};
    for (const key of ['created', 'updated']) {
      dates[key] = set[key] ?? '';
      if (
        typeof dates[key] !== 'string' ||
        (dates[key] && !Number.isFinite(Date.parse(dates[key])))
      )
        fail(`Saved set “${set.name}” has an invalid date.`);
    }
    return {
      id: set.id,
      name: set.name,
      description,
      ...dates,
      words: stringList(set.words ?? [], 'set keywords'),
      items,
    };
  });
  if (settings.setId && !ids.has(settings.setId))
    fail('The selected saved set is missing from the configuration.');
  return {
    gifbit: 'configuration',
    version: 1,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : '',
    settings,
    sets,
    excluded: stringList(value.excluded, 'excluded animations'),
    favorites: stringList(value.favorites, 'favorite banks', bankPath),
  };
}

export function createConfiguration(settings, sets, excluded, favorites, date = new Date()) {
  return readConfiguration({
    gifbit: 'configuration',
    version: 1,
    exportedAt: date.toISOString(),
    settings,
    sets,
    excluded: [...excluded],
    favorites: [...favorites],
  });
}

export function restoreConfiguration(storage, value) {
  const config = readConfiguration(value);
  const entries = [
    ['gifbit.v1', JSON.stringify(config.settings)],
    ['gifbit.sets', JSON.stringify(config.sets)],
    ['gifbit.excluded', JSON.stringify(config.excluded)],
    ['gifbit.banks.favorites', JSON.stringify(config.favorites)],
    [restoreKey, '1'],
  ];
  let previous;
  try {
    previous = new Map(entries.map(([key]) => [key, storage.getItem(key)]));
  } catch {
    fail('Browser storage is unavailable. Nothing was imported.');
  }
  const marker = entries.pop();
  const change = ([key, text]) => text.length - (previous.get(key)?.length ?? -key.length);
  entries.sort((a, b) => change(a) - change(b));
  entries.push(marker);
  let written = 0;
  try {
    for (const [key, text] of entries) {
      storage.setItem(key, text);
      written++;
    }
  } catch {
    try {
      while (written) {
        const index = --written;
        const key = entries[index][0];
        const before = previous.get(key);
        if (before === null) storage.removeItem(key);
        else storage.setItem(key, before);
      }
    } catch {
      fail(
        'Browser storage failed during recovery. Keep both configuration files and retry the import.',
      );
    }
    fail(
      'Could not save the configuration. Browser storage may be full or unavailable. Your previous configuration was kept.',
    );
  }
}

export function consumeRestore(storage) {
  try {
    const restored = storage.getItem(restoreKey) === '1';
    if (restored) storage.removeItem(restoreKey);
    return restored;
  } catch {
    return false;
  }
}
