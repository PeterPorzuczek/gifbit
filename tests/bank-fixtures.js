import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const samplePath = fileURLToPath(
  new URL('../gif-banks/2026-11-05-hh3.json', import.meta.url),
);
export const sample = JSON.parse(await readFile(samplePath, 'utf8'));
export const apiRoot = 'https://api.github.com/repos/PeterPorzuczek/gifbit';
export const sampleEntry = {
  path: 'gif-banks/2026-11-05-hh3.json',
  sha: 'a'.repeat(40),
  type: 'blob',
  mode: '100644',
};

export async function mockBanks(page) {
  await page.route(`${apiRoot}/git/trees/main?recursive=1`, (route) =>
    route.fulfill({ json: { tree: [sampleEntry], truncated: false } }),
  );
  await page.route(`${apiRoot}/git/blobs/${sampleEntry.sha}`, (route) =>
    route.fulfill({ json: sample }),
  );
}

export async function importSampleBank(page) {
  await page.locator('#banks-open').click();
  await page.locator('.bank-open').first().click();
  await page.locator('#bank-import').click();
}
