import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build, transform } from 'esbuild';

const root = fileURLToPath(new URL('./', import.meta.url));
const options = {
  absWorkingDir: root,
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  charset: 'utf8',
};

export async function buildHtml() {
  const [template, css, icon, sample, worklet] = await Promise.all([
    readFile(new URL('index.html', import.meta.url), 'utf8'),
    readFile(new URL('style.css', import.meta.url), 'utf8'),
    readFile(new URL('favicon.svg', import.meta.url)),
    readFile(new URL('sample.json', import.meta.url), 'utf8'),
    build({ ...options, entryPoints: ['src/worklet.js'] }),
  ]);
  const embedded = `
export async function loadSampleText() { return ${JSON.stringify(JSON.stringify(JSON.parse(sample)))}; }
export function loadWorklet(context) {
  return context.audioWorklet.addModule(${JSON.stringify('data:text/javascript;base64,' + Buffer.from(worklet.outputFiles[0].text).toString('base64'))});
}`;
  const [app, style] = await Promise.all([
    build({
      ...options,
      entryPoints: ['src/app.js'],
      plugins: [
        {
          name: 'embedded-resources',
          setup(builder) {
            builder.onLoad({ filter: /[\\/]resources\.js$/ }, ({ path }) => {
              if (path !== resolve(root, 'src/resources.js')) return;
              return { contents: embedded, loader: 'js' };
            });
          },
        },
      ],
    }),
    transform(css, { loader: 'css', minify: true, legalComments: 'none' }),
  ]);
  const replacements = [
    [
      '<link rel="stylesheet" href="./style.css" />',
      `<style>${style.code.replace(/<\/style/gi, '<\\/style')}</style>`,
    ],
    ['href="./favicon.svg"', `href="data:image/svg+xml;base64,${icon.toString('base64')}"`],
    [
      '<script type="module" src="./src/app.js"></script>',
      `<script>${app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`,
    ],
  ];
  let html = template;
  for (const [source, replacement] of replacements) {
    if (!html.includes(source)) throw new Error(`Missing entry in index.html: ${source}`);
    html = html.replace(source, () => replacement);
  }
  return html;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const html = await buildHtml();
  const output = new URL('gifbit.html', import.meta.url);
  await writeFile(output, html);
  console.log(
    `Built ${fileURLToPath(output)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`,
  );
}
