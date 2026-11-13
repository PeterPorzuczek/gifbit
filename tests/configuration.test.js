import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeSettings } from '../src/settings/schema.js';
import { presetMask } from '../src/scene/geometry.js';
import { setsFromJson } from '../src/library/format.js';
import {
  createConfiguration,
  readConfiguration,
  restoreConfiguration,
  consumeRestore,
} from '../src/settings/configuration.js';

const sample = JSON.parse(await readFile(new URL('../gif-banks/sample.json', import.meta.url)));
const set = {
  ...setsFromJson(sample)[0],
  id: 'my-set',
  created: '2026-11-14T10:00:00Z',
  updated: '2026-11-14T11:00:00Z',
};
const settings = normalizeSettings({
  key: 'test-key',
  words: 'neon, dance',
  setId: set.id,
  bpm: 123.5,
  bgImg: 'data:image/png;base64,aGVsbG8=',
  tintOn: true,
  autoCols: [],
});
settings.scene.enabled = true;
settings.scene.wide = presetMask(settings.scene.wide, 'wide', 'triangle');
settings.scene.narrow = presetMask(settings.scene.narrow, 'narrow', 'center');
const config = () =>
  createConfiguration(settings, [set], [set.items[0].id], ['gif-banks/sample.json']);
const memory = () => {
  const values = new Map([
    ['gifbit.v1', '{"max":3}'],
    ['gifbit.sets', '["old"]'],
    ['gifbit.excluded', '["old-id"]'],
    ['other-app', 'unchanged'],
  ]);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test('one configuration preserves every setting, both scene masks, sets, exclusions and favorites', () => {
  const exported = config();
  const imported = readConfiguration(JSON.parse(JSON.stringify(exported)));
  assert.deepEqual(imported, exported);
  assert.deepEqual(imported.settings, settings);
  assert.deepEqual(imported.sets, [set]);
  assert.deepEqual(imported.excluded, [set.items[0].id]);
  assert.deepEqual(imported.favorites, ['gif-banks/sample.json']);
  imported.settings.scene.wide.cells = '';
  imported.sets[0].items[0].word = 'changed';
  assert.notEqual(settings.scene.wide.cells, '');
  assert.notEqual(set.items[0].word, 'changed');
});

test('invalid configurations cannot overwrite any storage', () => {
  const variants = [
    () => null,
    () => sample,
    (c) => ({ ...c, version: 2 }),
    (c) => ({ ...c, settings: {} }),
    (c) => ({ ...c, settings: { ...c.settings, max: -1 } }),
    (c) => ({
      ...c,
      settings: {
        ...c.settings,
        scene: { ...c.settings.scene, wide: { resolution: 1, cells: '101' } },
      },
    }),
    (c) => ({ ...c, sets: [c.sets[0], c.sets[0]] }),
    (c) => ({ ...c, sets: [] }),
    (c) => ({
      ...c,
      sets: [{ ...c.sets[0], items: [{ ...c.sets[0].items[0], big: 'javascript:alert(1)' }] }],
    }),
    (c) => ({ ...c, excluded: 'wrong' }),
    (c) => ({ ...c, favorites: ['gif-banks/../bad.json'] }),
  ];
  for (const change of variants) {
    const storage = memory();
    const before = new Map(storage.values);
    assert.throws(() => restoreConfiguration(storage, change(config())));
    assert.deepEqual(storage.values, before);
  }
});

test('a failed write at any step rolls back all earlier writes and removes newly created keys', () => {
  for (let failAt = 1; failAt <= 5; failAt++) {
    const storage = memory();
    const before = new Map(storage.values);
    const write = storage.setItem;
    let calls = 0;
    storage.setItem = (key, value) => {
      if (++calls === failAt) throw new Error('Quota exceeded');
      write(key, value);
    };
    assert.throws(() => restoreConfiguration(storage, config()), /previous configuration was kept/);
    assert.deepEqual(storage.values, before);
  }
});

test('restore writes only configuration keys and selects the restored source on its first load', () => {
  const storage = memory();
  const value = config();
  restoreConfiguration(storage, value);
  assert.deepEqual(JSON.parse(storage.getItem('gifbit.v1')), value.settings);
  assert.deepEqual(JSON.parse(storage.getItem('gifbit.sets')), value.sets);
  assert.deepEqual(JSON.parse(storage.getItem('gifbit.excluded')), value.excluded);
  assert.deepEqual(JSON.parse(storage.getItem('gifbit.banks.favorites')), value.favorites);
  assert.equal(storage.getItem('other-app'), 'unchanged');
  assert.equal(consumeRestore(storage), true);
  assert.equal(consumeRestore(storage), false);
});

test('restore releases space from shrinking entries before saving a larger background', () => {
  const storage = memory();
  storage.values.set('gifbit.sets', '[]' + ' '.repeat(1000000));
  const size = () =>
    [...storage.values].reduce((total, [key, value]) => total + key.length + value.length, 0);
  const quota = size() + 100;
  storage.setItem = (key, value) => {
    const before = storage.values.get(key);
    const growth = value.length - (before?.length ?? -key.length);
    if (size() + growth > quota) throw new Error('Quota exceeded');
    storage.values.set(key, value);
  };
  const value = config();
  value.settings.bgImg = 'data:image/png;base64,' + 'a'.repeat(500000);
  restoreConfiguration(storage, value);
  assert.deepEqual(JSON.parse(storage.getItem('gifbit.v1')), value.settings);
  assert.deepEqual(JSON.parse(storage.getItem('gifbit.sets')), value.sets);
});

test('an empty configuration and settings from an older export remain usable', () => {
  const empty = createConfiguration(normalizeSettings({}), [], [], []);
  assert.deepEqual(readConfiguration(empty), empty);
  const older = { ...empty, settings: { source: 'words', key: '', words: 'dance' } };
  assert.equal(readConfiguration(older).settings.scene.enabled, false);
  assert.throws(
    () =>
      restoreConfiguration(
        {
          getItem() {
            throw new Error('Denied');
          },
        },
        empty,
      ),
    /Nothing was imported/,
  );
});
