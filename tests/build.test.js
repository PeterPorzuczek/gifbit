import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { buildAssets, buildHtml } from '../scripts/build.mjs';

test('single-file export embeds its assets and preserves every interface element', async () => {
  const [html, source] = await Promise.all([
    buildHtml(),
    readFile(new URL('../src/index.html', import.meta.url), 'utf8'),
  ]);
  const ids = (text) =>
    [...text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').matchAll(/\bid="([^"]+)"/g)].map(
      (match) => match[1],
    );
  assert.deepEqual(ids(html), ids(source));
  assert.doesNotMatch(html, /<script[^>]+\bsrc=|<link[^>]+rel="stylesheet"/i);
  assert.match(html, /href="data:image\/svg\+xml;base64,/);
  assert.doesNotMatch(html, /import\.meta/);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Script(scripts[0][1]));
});

test('production assets contain every local entry and preserve the sample data', async () => {
  const files = await buildAssets();
  assert.deepEqual(Object.keys(files).sort(), [
    'app.js',
    'favicon.svg',
    'index.html',
    'sample.json',
    'style.css',
    'worklet.js',
  ]);
  for (const [, path] of files['index.html'].matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
    assert.ok(Object.hasOwn(files, path), `Missing output asset: ${path}`);
  }
  assert.equal(
    files['sample.json'],
    await readFile(new URL('../src/sample.json', import.meta.url), 'utf8'),
  );
  assert.match(files['app.js'], /new URL\("\.\/sample\.json",import\.meta\.url\)/);
  assert.match(files['app.js'], /new URL\("\.\/worklet\.js",import\.meta\.url\)/);
  assert.doesNotMatch(files['worklet.js'], /\bimport\s/);
});
