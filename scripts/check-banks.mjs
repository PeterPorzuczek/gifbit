import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { bankFromJson } from '../src/banks/format.js';
import { unpackItem } from '../src/library/format.js';

const root = new URL('../gif-banks/', import.meta.url);
let count = 0;
async function check(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    const url = new URL(encodeURIComponent(entry.name), directory);
    if (entry.isDirectory()) {
      await check(new URL(`${encodeURIComponent(entry.name)}/`, directory), `${path}/`);
      continue;
    }
    if (!/\.json$/i.test(entry.name)) continue;
    if (!entry.isFile()) throw new Error(`${path}: expected a regular JSON file`);
    validateBankFile(JSON.parse(await readFile(url, 'utf8')), path);
    count++;
  }
}
export function validateBankFile(value, path) {
  const filename = path.split('/').pop();
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(filename))
    throw new Error(`${path}: use YYYY-MM-DD-name.json`);
  const date = filename.slice(0, 10);
  if (Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
    throw new Error(`${path}: invalid date`);
  if (value?.gifbit !== 1) throw new Error(`${path}: expected gifbit: 1`);
  const sets = Array.isArray(value.sets) ? value.sets : [value];
  for (const set of [value, ...sets]) {
    if (!set || typeof set !== 'object') throw new Error(`${path}: invalid set`);
    if (set.name !== undefined && (typeof set.name !== 'string' || set.name.length > 60))
      throw new Error(`${path}: name must be text, up to 60 characters`);
    if (
      set.description !== undefined &&
      (typeof set.description !== 'string' || set.description.length > 1000)
    )
      throw new Error(`${path}: description must be text, up to 1000 characters`);
  }
  for (const set of sets) {
    if (
      !Array.isArray(set.items) ||
      !set.items.length ||
      set.items.some((item) => !unpackItem(item))
    )
      throw new Error(`${path}: all animations must have an id and a valid HTTPS image URL`);
    if (new Set(set.items.map((item) => item.id)).size !== set.items.length)
      throw new Error(`${path}: duplicate animation ids`);
  }
  bankFromJson(value, path);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await check(root);
  console.log(`Validated ${count} GIF banks in ${fileURLToPath(root)}.`);
}
