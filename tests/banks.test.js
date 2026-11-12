import test from 'node:test';
import assert from 'node:assert/strict';
import { listBanks, readBank, readStarterBank } from '../src/banks/api.js';
import { bankFromJson } from '../src/banks/format.js';
import { exportFilename, exportObj, setsFromJson } from '../src/library/format.js';
import { sample, sampleEntry, apiRoot, starter, starterUrl } from './bank-fixtures.js';
import { validateBankFile } from '../scripts/check-banks.mjs';

test('PR validation accepts exports and rejects invalid filenames, dates, metadata and animations', () => {
  assert.doesNotThrow(() => validateBankFile(sample, '2026-11-05-hh3.json'));
  assert.doesNotThrow(() => validateBankFile(sample, 'sample.json'));
  assert.doesNotThrow(() =>
    validateBankFile({ gifbit: 1, sets: [sample] }, '2026-11-12-all-sets.json'),
  );
  for (const filename of [
    'undated.json',
    'nested/sample.json',
    'Sample.json',
    '2026-11-12-Bank.JSON',
    '2026-02-30-bank.json',
    '2026-13-01-bank.json',
  ]) {
    assert.throws(() => validateBankFile(sample, filename));
  }
  for (const invalid of [
    { ...sample, name: {} },
    { ...sample, description: 'x'.repeat(1001) },
    { ...sample, gifbit: 2 },
    { ...sample, items: [] },
    { ...sample, items: [sample.items[0], sample.items[0]] },
    { ...sample, items: [{ id: 'bad', big: 'javascript:alert(1)' }] },
    { gifbit: 1, sets: [null] },
  ]) {
    assert.throws(() => validateBankFile(invalid, '2026-11-12-bank.json'));
    assert.throws(() => validateBankFile(invalid, 'sample.json'));
  }
});

test('bank metadata survives import and export, with filename and empty description fallbacks', () => {
  const value = { ...sample, name: 'Late night', description: 'Neon and city lights' };
  const [set] = setsFromJson(value);
  assert.equal(exportObj(set).description, value.description);
  assert.equal(bankFromJson(exportObj(set), '2026-11-12-mix.json').name, value.name);
  const legacy = { items: sample.items };
  const bank = bankFromJson(legacy, 'gif-banks/2026-11-12-mix.json');
  assert.equal(bank.name, '2026-11-12-mix');
  assert.equal(bank.description, '');
  assert.equal(setsFromJson(legacy, 'from-file')[0].name, 'from-file');
  assert.equal(
    exportFilename('Żółć i Łódź', new Date('2026-11-12T22:00:00Z')),
    '2026-11-12-zolc-i-lodz.json',
  );
});

test('multi-set exports form one preview bank without duplicate or unsafe images', () => {
  const bank = bankFromJson(
    { gifbit: 1, name: 'Collection', description: 'Two sets', sets: [sample, sample] },
    'collection.json',
  );
  assert.equal(bank.items.length, 255);
  assert.equal(bank.description, 'Two sets');
  assert.throws(() => bankFromJson({ gifbit: 2, items: sample.items }, 'bad.json'), /unsupported/);
  assert.throws(
    () => bankFromJson({ items: [{ id: 'x', big: 'javascript:alert(1)' }] }, 'bad.json'),
    /valid animations/,
  );
});

test('GitHub lists JSON banks without fetching their content and opens the exact selected blob', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify(
        calls.length === 1
          ? {
              tree: [
                sampleEntry,
                { ...sampleEntry, path: 'src/unrelated.json' },
                { ...sampleEntry, path: 'gif-banks/readme.md' },
                { ...sampleEntry, path: 'gif-banks/.hidden.json' },
                { ...sampleEntry, path: 'gif-banks/link.json', mode: '120000' },
                { ...sampleEntry, path: 'gif-banks/bad.json', sha: '../other' },
              ],
            }
          : sample,
      ),
    );
  };
  const entries = await listBanks(fetcher);
  assert.deepEqual(entries, [{ path: sampleEntry.path, sha: sampleEntry.sha }]);
  assert.equal(calls.length, 1);
  const bank = await readBank(entries[0], fetcher);
  assert.equal(bank.items.length, 255);
  assert.equal(calls[1].url, `${apiRoot}/git/blobs/${sampleEntry.sha}`);
  assert.equal(calls[1].options.headers.Accept, 'application/vnd.github.raw+json');
});

test('GitHub errors and incomplete lists are reported without returning partial results', async () => {
  for (const status of [403, 404, 409, 429, 500]) {
    await assert.rejects(
      listBanks(async () => new Response('{}', { status })),
      /GitHub|published/,
    );
  }
  await assert.rejects(
    listBanks(async () => new Response('{bad')),
    /invalid bank list/,
  );
  await assert.rejects(
    listBanks(async () => new Response(JSON.stringify({ tree: [sampleEntry], truncated: true }))),
    /incomplete/,
  );
  await assert.rejects(
    readBank(sampleEntry, async () => new Response('{bad')),
    /valid JSON/,
  );
  await assert.rejects(
    listBanks(async () => {
      throw new Error('offline');
    }),
    /connection/,
  );
});

test('the starter bank uses one GitHub API request to the reserved file on main', async () => {
  const calls = [];
  const bank = await readStarterBank(async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(starter));
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, starterUrl);
  assert.equal(calls[0].options.headers.Accept, 'application/vnd.github.raw+json');
  assert.equal(bank.name, starter.name);
  assert.equal(bank.items.length, 330);
  await assert.rejects(
    readStarterBank(async () => new Response('{broken')),
    /valid JSON/,
  );
});
