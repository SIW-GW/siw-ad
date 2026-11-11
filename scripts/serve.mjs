import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL(process.argv.includes('--demo') ? '../.preview/demo/' : '../dist/', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const prefix = '/siw-ad/';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

try {
  await stat(path.join(root, 'index.html'));
} catch {
  console.error('ビルドがありません。npm run build（本番）またはnpm run demo（サンプル）を実行してください。');
  process.exit(1);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') {
      response.writeHead(302, { Location: prefix }).end();
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method) || !url.pathname.startsWith(prefix)) {
      response.writeHead(404).end('Not found');
      return;
    }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length));
    const filename = path.resolve(root, relative.endsWith('/') || !relative ? `${relative}index.html` : relative);
    if (!filename.startsWith(`${root}${path.sep}`) || relative.split('/').some(part => part.startsWith('.'))) {
      response.writeHead(404).end('Not found');
      return;
    }
    const data = await readFile(filename);
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) || error instanceof URIError) {
      response.writeHead(404).end('Not found');
    } else {
      console.error(error);
      response.writeHead(500).end('Internal server error');
    }
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}${prefix}`));
