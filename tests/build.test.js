import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { buildHtml } from '../build.mjs';

test('single-file export embeds its assets and preserves every interface element', async () => {
  const [html, source] = await Promise.all([
    buildHtml(),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
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
