import { readFile, stat } from 'node:fs/promises';
import { createServer, request as proxyRequest } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const apiHost = process.env.API_HOST || 'backend';
const apiPort = Number(process.env.API_PORT || 8000);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function proxyApi(req, res) {
  const upstream = proxyRequest({
    hostname: apiHost,
    port: apiPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${apiHost}:${apiPort}` },
  }, upstreamResponse => {
    res.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(res);
  });

  upstream.on('error', error => {
    console.error('API proxy error:', error.message);
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ detail: 'The screening service is temporarily unavailable.' }));
  });

  req.pipe(upstream);
}

async function serveFile(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  const requestedPath = path.resolve(root, `.${pathname}`);
  if (requestedPath !== root && !requestedPath.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let filePath = requestedPath;
  try {
    if ((await stat(filePath)).isDirectory()) filePath = path.join(filePath, 'index.html');
    await stat(filePath);
  } catch {
    
    filePath = path.join(root, 'index.html');
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'content-length': body.length,
      'x-content-type-options': 'nosniff',
    });
    if (req.method === 'HEAD') res.end();
    else res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

createServer((req, res) => {
  if (req.url === '/api' || req.url?.startsWith('/api/')) proxyApi(req, res);
  else if (req.method === 'GET' || req.method === 'HEAD') void serveFile(req, res);
  else res.writeHead(405, { allow: 'GET, HEAD' }).end('Method not allowed');
}).listen(3000, '0.0.0.0', () => {
  console.log('TB Detect frontend listening on http://0.0.0.0:3000');
  console.log(`API requests proxy to ${apiHost}:${apiPort}`);
});
