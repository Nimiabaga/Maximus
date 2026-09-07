/* ============================================================
   scripts/dev-server.mjs
   Minimal local dev server: serves the static site and routes
   /api/* to the matching handler in api/, so you can test the
   admin backend locally without installing/logging into the
   Vercel CLI. Not used in production -- Vercel serves /api/*
   itself there. Loads .env.local if present.
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;

loadEnvFile(path.join(root, '.env.local'));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function enhanceResponse(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (obj) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

async function handleApi(req, res, apiPath) {
  // /api/admin/menu -> api/admin/menu.js ; /api/login -> api/login.js
  const modulePath = path.join(root, 'api', apiPath + '.js');
  if (!fs.existsSync(modulePath)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const bodyText = await readBody(req);
  if (bodyText) {
    try { req.body = JSON.parse(bodyText); } catch { req.body = {}; }
  } else {
    req.body = {};
  }

  const mod = await import(`${pathToFileUrl(modulePath)}?t=${Date.now()}`);
  await mod.default(req, enhanceResponse(res));
}

function pathToFileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/');
}

function serveStatic(req, res, urlPath) {
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  filePath = path.join(root, decodeURIComponent(filePath));

  if (!filePath.startsWith(root)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname.slice('/api/'.length));
    } else {
      serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
