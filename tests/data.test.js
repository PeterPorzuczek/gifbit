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

