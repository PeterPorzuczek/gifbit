import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--source'))
  throw new Error('Usage: node scripts/serve.mjs [--source]');
const source = args.includes('--source');
const root = fileURLToPath(new URL(source ? '../src/' : '../dist/', import.meta.url));
const dataRoot = fileURLToPath(new URL('../data/', import.meta.url));
await stat(resolve(root, 'index.html')).catch(() => {
  throw new Error('No app to serve. Run npm run build first or use npm run dev.');
});
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname.replace(/^\/gifbit(?=\/|$)/, '');
    const segments = relative.split('/');
    if (segments.some((segment) => segment.startsWith('.') || segment.includes('\\'))) {
      response.writeHead(404).end();
      return;
    }
    const isData = source && relative.startsWith('/data/');
    const directory = isData ? dataRoot : root;
    let file = resolve(directory, '.' + (isData ? relative.slice(5) : relative));
    if (file !== resolve(directory) && !file.startsWith(resolve(directory) + sep)) {
      response.writeHead(404).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`GIFbit: http://127.0.0.1:${port}/gifbit/`));
