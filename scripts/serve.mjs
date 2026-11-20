import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] || '_site');
const mount = '/recipes/';
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer(async (request, response) => {
  try {
    const { pathname, search } = new URL(request.url, 'http://localhost');
    if (pathname === mount.slice(0, -1) || pathname === '/') {
      response.writeHead(302, { Location: mount + search }).end();
      return;
    }
    if (!pathname.startsWith(mount)) {
      response.writeHead(404).end('Not found');
      return;
    }

    const relative = decodeURIComponent(pathname.slice(mount.length));
    const filename = resolve(root, relative.endsWith('/') || !relative ? relative + 'index.html' : relative);
    if (!filename.startsWith(root + sep)) {
      response.writeHead(404).end('Not found');
      return;
    }

    try {
      const body = await readFile(filename);
      response.writeHead(200, { 'Content-Type': types[extname(filename)] || 'application/octet-stream' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (error.code === 'EISDIR') {
        response.writeHead(301, { Location: pathname + '/' + search }).end();
      } else {
        response.writeHead(404).end('Not found');
      }
    }
  } catch {
    response.writeHead(400).end('Bad request');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${mount}`));
