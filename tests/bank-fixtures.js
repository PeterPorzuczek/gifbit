import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const samplePath = fileURLToPath(
  new URL('../gif-banks/2026-11-05-hh3.json', import.meta.url),
);
export const sample = JSON.parse(await readFile(samplePath, 'utf8'));
export const apiRoot = 'https://api.github.com/repos/PeterPorzuczek/gifbit';
export const starterUrl = `${apiRoot}/contents/gif-banks/sample.json?ref=main`;
export const starter = JSON.parse(
  await readFile(new URL('../gif-banks/sample.json', import.meta.url), 'utf8'),
);
export const sampleEntry = {
  path: 'gif-banks/2026-11-05-hh3.json',
  sha: 'a'.repeat(40),
  type: 'blob',
  mode: '100644',
};

export async function mockBanks(page) {
  await mockStarter(page);
  await page.route(`${apiRoot}/git/trees/main?recursive=1`, (route) =>
    route.fulfill({ json: { tree: [sampleEntry], truncated: false } }),
  );
  await page.route(`${apiRoot}/git/blobs/${sampleEntry.sha}`, (route) =>
    route.fulfill({ json: sample }),
  );
}

export async function mockStarter(page, value = null) {
  await page.route(starterUrl, (route) =>
    route.fulfill(value ? { json: value } : { status: 404, json: {} }),
  );
}

export async function importSampleBank(page) {
  await page.locator('#banks-open').click();
  await page.locator('.bank-open').first().click();
  await page.locator('#bank-import').click();
}
