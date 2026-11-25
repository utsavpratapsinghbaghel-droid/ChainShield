'use strict';
// Small helpers so the project needs no outside packages.
const fs = require('fs');
const path = require('path');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// A tiny router. Patterns look like /orders/:orderId
function createRouter() {
  const routes = [];
  function add(method, pattern, handler, opts) {
    const keys = [];
    const source = pattern.replace(/:([A-Za-z]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    routes.push({ method, regex: new RegExp('^' + source + '$'), keys, handler, auth: !(opts && opts.auth === false) });
  }
  return {
    routes,
    get: (p, h, o) => add('GET', p, h, o),
    post: (p, h, o) => add('POST', p, h, o),
    put: (p, h, o) => add('PUT', p, h, o),
    find(method, pathname) {
      for (const r of routes) {
        if (r.method !== method) continue;
        const m = r.regex.exec(pathname);
        if (!m) continue;
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return { route: r, params };
      }
      return null;
    },
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new HttpError(413, 'Request body is too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new HttpError(400, 'Request body is not valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(text);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };

function serveStatic(res, publicDir, pathname) {
  const clean = pathname === '/' ? '/index.html' : pathname;
  const file = path.join(publicDir, path.normalize(clean));
  if (!file.startsWith(publicDir)) return false;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
  return true;
}

// Small validation helpers used by the modules.
function requireFields(body, fields) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      throw new HttpError(400, 'Missing field: ' + f);
    }
  }
}
function requireNumber(value, name) {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new HttpError(400, name + ' must be a number');
  return value;
}

module.exports = { HttpError, createRouter, readJson, sendJson, serveStatic, requireFields, requireNumber };
