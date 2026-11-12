import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build, transform } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
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

async function loadAssets() {
  const [template, css, icon, worklet] = await Promise.all([
    readFile(new URL('../src/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/assets/style.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/assets/favicon.svg', import.meta.url)),
    build({ ...options, entryPoints: ['src/audio/worklet.js'] }),
  ]);
  const style = await transform(css, {
    loader: 'css',
    minify: true,
    legalComments: 'none',
  });
  return {
    template,
    style: style.code,
    icon,
    worklet: worklet.outputFiles[0].text,
  };
}

export async function buildHtml(assets) {
  const { template, style, icon, worklet } = assets || (await loadAssets());
  const embedded = `
export function loadWorklet(context) {
  return context.audioWorklet.addModule(${JSON.stringify('data:text/javascript;base64,' + Buffer.from(worklet).toString('base64'))});
}`;
  const app = await build({
    ...options,
    entryPoints: ['src/app.js'],
    plugins: [
      {
        name: 'embedded-resources',
        setup(builder) {
          builder.onLoad({ filter: /[\\/]resources\.js$/ }, ({ path }) => {
            if (path !== resolve(root, 'src/core/resources.js')) return;
            return { contents: embedded, loader: 'js' };
          });
        },
      },
    ],
  });
  const replacements = [
    [
      '<link rel="stylesheet" href="./assets/style.css" />',
      `<style>${style.replace(/<\/style/gi, '<\\/style')}</style>`,
    ],
    ['href="./assets/favicon.svg"', `href="data:image/svg+xml;base64,${icon.toString('base64')}"`],
    [
      '<script type="module" src="./app.js"></script>',
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

export async function buildAssets({ single = false } = {}) {
  const assets = await loadAssets();
  const app = await build({
    ...options,
    format: 'esm',
    entryPoints: ['src/app.js'],
  });
  const files = {
    'index.html': assets.template,
    'assets/style.css': assets.style,
    'assets/favicon.svg': assets.icon,
    'app.js': app.outputFiles[0].text,
    'audio/worklet.js': assets.worklet,
  };
  if (single) files['gifbit.html'] = await buildHtml(assets);
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--single'))
    throw new Error('Usage: node scripts/build.mjs [--single]');
  const files = await buildAssets({ single: args.includes('--single') });
  const output = resolve(root, 'dist');
  if (output !== fileURLToPath(new URL('../dist', import.meta.url)))
    throw new Error('Invalid output directory');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await Promise.all(
    Object.entries(files).map(async ([name, contents]) => {
      const file = resolve(output, name);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, contents);
    }),
  );
  console.log(`Built ${Object.keys(files).length} files in ${output}`);
}
