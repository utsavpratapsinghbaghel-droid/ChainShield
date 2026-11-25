'use strict';
// One server that mounts every module. Run it with: npm start
const http = require('http');
const path = require('path');
const { createRouter, readJson, sendJson, serveStatic, HttpError } = require('./lib/http');
const { createStore } = require('./store');
const db = require('./db');

const modules = [
  require('./modules/m1-accounts'),
  require('./modules/m2-orders'),
  require('./modules/m3-risk'),
  require('./modules/m4-tracking'),
  require('./modules/m5-alerts'),
  require('./modules/m6-dashboard'),
  require('./modules/m8-ai'),
  require('./modules/dev'),
];

function createApp(options) {
  const opts = options || {};
  const store = createStore({ seed: opts.seed });
  const router = createRouter();
  modules.forEach((m) => m.register(router, store));
  router.get('/health', () => ({ ok: true }), { auth: false });

  const publicDir = path.join(__dirname, '..', 'public');

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const found = router.find(req.method, url.pathname);
      if (!found) {
        if (req.method === 'GET' && serveStatic(res, publicDir, url.pathname)) return;
        throw new HttpError(404, 'Not found: ' + req.method + ' ' + url.pathname);
      }

      let business = null;
      if (found.route.auth) {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        const id = store.sessions.get(token);
        business = id ? store.businesses.get(id) : null;
        if (!business) throw new HttpError(401, 'Log in first. Send the token as "Authorization: Bearer <token>"');
      }

      const body = req.method === 'GET' ? {} : await readJson(req);
      const result = await found.route.handler({
  params: found.params,
  query: Object.fromEntries(url.searchParams),
  body,
  business,
  store,
});

// Persist state after successful API operations.
if (req.method !== 'GET' && req.method !== 'HEAD') {
  try {
    await db.saveState(store.exportState());
  } catch (persistErr) {
    console.error('HANA persistence failed:', persistErr);
  }
}

sendJson(res, 200, result === undefined ? { ok: true } : result);
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) console.error(err);
      sendJson(res, status, { error: status === 500 ? 'Something went wrong on the server' : err.message });
    }
  });
  server.store = store;
  return server;
}

module.exports = { createApp };

if (require.main === module) {
  async function start() {
    await db.initialize();

    const server = createApp({ seed: true });
    const savedState = await db.loadState();

    if (savedState) {
      server.store.importState(savedState);
      console.log('Saved ChainShield state restored from HANA.');
    } else {
      console.log('No saved state found. Starting with demo data.');
    }

    const port = process.env.PORT || 3000;

    server.listen(port, () => {
      console.log('ChainShield prototype running at http://localhost:' + port);
      console.log('Demo login: mobile 9999999999, OTP 123456');
    });
  }

  start().catch((err) => {
    console.error('ChainShield startup failed:', err);
    process.exit(1);
  });
}
