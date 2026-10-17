import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setsFromJson, exportObj, unpackItem, slug } from '../src/data/sets.js';
import { normalizeSettings, defaults } from '../src/data/settings.js';

const sample = JSON.parse(await readFile(new URL('../sample.json', import.meta.url)));

test('the complete sample survives a set export and import', () => {
  const [set] = setsFromJson(sample);
  assert.equal(set.items.length, 255);
  assert.equal(set.name, sample.name);
  assert.deepEqual(setsFromJson(exportObj(set)), [set]);
  assert.deepEqual(setsFromJson({ gifbit: 1, sets: [sample] }), [set]);
  assert.deepEqual(setsFromJson([sample]), [set]);
});

test('imports discard duplicates and unsafe or malformed URLs', () => {
  const item = sample.items[0];
  const [set] = setsFromJson({
    items: [item, item, null, { ...item, id: 'bad', big: 'javascript:alert(1)' }],
  });
  assert.equal(set.items.length, 1);
  for (const big of [
    'https://',
    'http://example.com/a.gif',
    'https://name:secret@example.com/a.gif',
  ]) {
    assert.equal(unpackItem({ ...item, big }), null);
  }
  assert.equal(unpackItem({ ...item, w: -10, h: Infinity }).w, 1);
  assert.equal(unpackItem({ ...item, w: -10, h: Infinity }).h, 1);
  assert.deepEqual(setsFromJson(null), []);
});

test('export filenames support Polish names and empty labels', () => {
  assert.equal(slug('Żółć i Łódź!'), 'zolc-i-lodz');
  assert.equal(slug('!!!'), 'set');
});

test('valid legacy settings and an intentionally empty palette are preserved', () => {
  const legacy = { ...defaults, bpm: 123.5, source: 'set', setId: 's123', autoCols: [] };
  assert.deepEqual(normalizeSettings(legacy), legacy);
});

