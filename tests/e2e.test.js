'use strict';
// End-to-end check: the whole flow from login to a saved decision.
// If a module breaks the contract, this test fails and the pull request cannot be merged.
const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/server');

test('full ChainShield flow', async (t) => {
  const app = createApp({ seed: false });
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((r) => server.once('listening', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  let token = null;

  async function call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  assert.strictEqual((await call('GET', '/health')).status, 200);
  assert.strictEqual((await call('GET', '/me')).status, 401);

  const M = '9999999999';
  await call('POST', '/auth/otp', { mobile: M });
  const reg = { mobile: M, otp: '123456', password: 'secret123', role: 'business', name: 'Shah Textiles', language: 'hi', consent: true };
  assert.strictEqual((await call('POST', '/auth/register', { ...reg, consent: false })).status, 400); // DPDP: no account without consent
  assert.strictEqual((await call('POST', '/auth/register', { ...reg, password: '123' })).status, 400); // password too short
  const registered = await call('POST', '/auth/register', reg);
  assert.strictEqual(registered.status, 200);
  assert.ok(registered.data.business.consentAt);
  assert.strictEqual(registered.data.business.language, 'hi');
  assert.strictEqual((await call('POST', '/auth/register', reg)).status, 409); // already registered

  // Log in again: password first, then OTP.
  assert.strictEqual((await call('POST', '/auth/login', { mobile: M, password: 'wrong-one' })).status, 401);
  assert.strictEqual((await call('POST', '/auth/verify', { mobile: M, otp: '123456' })).status, 401); // password step skipped
  assert.strictEqual((await call('POST', '/auth/login', { mobile: M, password: 'secret123' })).data.otpRequired, true);
  assert.strictEqual((await call('POST', '/auth/verify', { mobile: M, otp: '000000' })).status, 401);
  const v = await call('POST', '/auth/verify', { mobile: M, otp: '123456' });
  assert.strictEqual(v.status, 200);
  token = v.data.token;
  // Forgot password: new password works, old one stops working.
  await call('POST', '/auth/otp', { mobile: M });
  assert.strictEqual((await call('POST', '/auth/reset-password', { mobile: M, otp: '000000', password: 'newpass99' })).status, 401);
  assert.strictEqual((await call('POST', '/auth/reset-password', { mobile: M, otp: '123456', password: 'newpass99' })).data.reset, true);
  assert.strictEqual((await call('POST', '/auth/login', { mobile: M, password: 'secret123' })).status, 401);
  assert.strictEqual((await call('POST', '/auth/login', { mobile: M, password: 'newpass99' })).data.otpRequired, true);
  assert.strictEqual((await call('PUT', '/me', { language: 'fr' })).status, 400);
  assert.strictEqual((await call('PUT', '/me', { language: 'en' })).data.language, 'en');

  // Adding a partner needs their OTP (their consent to get WhatsApp messages).
  const addPartner = async (fields) => {
    await call('POST', '/partners/otp', { mobile: fields.mobile });
    return call('POST', '/partners', { otp: '123456', ...fields });
  };
  await call('POST', '/partners/otp', { mobile: '9876500001' });
  assert.strictEqual((await call('POST', '/partners', { name: 'Supplier X', role: 'supplier', mobile: '9876500001', address: 'Vapi, Gujarat', otp: '000000' })).status, 401); // wrong OTP
  const x = (await addPartner({ name: 'Supplier X', role: 'supplier', mobile: '9876500001', address: 'Vapi, Gujarat' })).data;
  const y = (await addPartner({ name: 'Supplier Y', role: 'supplier', mobile: '9876500002', address: 'Bhiwandi, Maharashtra' })).data;
  const c = (await addPartner({ name: 'Client', role: 'client', mobile: '9876500003', address: 'Mumbai' })).data;
  const z = (await addPartner({ name: 'Supplier Z', role: 'supplier', mobile: '9876500004', address: 'Ankleshwar, Gujarat', supplierType: 'alternative' })).data;
  const tr = (await addPartner({ name: 'Transporter T', role: 'transporter', mobile: '9876500005', address: 'Surat' })).data;
  assert.strictEqual(x.partnerId, 'par_001');
  assert.strictEqual(x.supplierType, 'main');
  assert.ok(x.lat && x.consentAt); // position found from the address text
  assert.strictEqual(tr.supplierType, null);
  assert.strictEqual((await addPartner({ name: 'Again', role: 'client', mobile: '9876500003', address: 'Mumbai' })).status, 409);
  assert.strictEqual((await call('GET', '/partners?role=transporter')).data.length, 1);

  // Main and alternative suppliers.
  assert.strictEqual((await call('PUT', '/partners/' + c.partnerId, { supplierType: 'main' })).status, 400); // clients cannot be main
  assert.strictEqual((await call('POST', '/orders', { clientId: c.partnerId, dueDate: '2026-12-05', lines: [{ supplierId: z.partnerId, valueRupees: 1000 }] })).status, 400); // alternatives cannot be ordered from
  assert.strictEqual((await call('PUT', '/partners/' + y.partnerId, { supplierType: 'alternative' })).data.supplierType, 'alternative');
  assert.strictEqual((await call('PUT', '/partners/' + y.partnerId, { supplierType: 'main' })).data.supplierType, 'main');

  const o = await call('POST', '/orders', {
    clientId: c.partnerId,
    dueDate: '2026-12-05',
    lines: [{ supplierId: x.partnerId, valueRupees: 400000 }, { supplierId: y.partnerId, valueRupees: 200000 }],
    routePoints: [{ label: 'Valsad (NH48)', lat: 20.5992, lng: 72.9342 }],
  });
  assert.strictEqual(o.status, 200);
  const orderId = o.data.orderId;

  // Calm weather: nothing at risk.
  let r = (await call('POST', '/risk/evaluate', { orderId })).data;
  assert.strictEqual(r.reduce((s, z) => s + z.valueAtRiskRupees, 0), 0);

  // Orange weather at Valsad.
  await call('POST', '/dev/weather', { lat: 20.5992, lng: 72.9342, radiusKm: 30, level: 'orange', label: 'Heavy rain' });
  r = (await call('POST', '/risk/evaluate', { orderId })).data;
  const byId = Object.fromEntries(r.map((z) => [z.supplierId, z]));
  assert.strictEqual(byId[x.partnerId].valueAtRiskRupees, 260000);
  assert.strictEqual(byId[y.partnerId].valueAtRiskRupees, 130000);

  const alerts = (await call('POST', '/alerts', { orderId })).data;
  assert.strictEqual(alerts.length, 2);
  assert.ok(alerts.every((a) => a.backupSupplierId === z.partnerId)); // the alternative supplier is suggested
  assert.ok(alerts[0].message.includes('Supplier Z'));

  // The owner asks the driver for live location; the driver is the saved transporter.
  assert.strictEqual((await call('POST', '/tracking/request', { orderId: 'ord_999' })).status, 404);
  const lr = await call('POST', '/tracking/request', { orderId });
  assert.strictEqual(lr.status, 200);
  assert.strictEqual(lr.data.status, 'waiting');
  assert.strictEqual(lr.data.transporterId, tr.partnerId);

  const t1 = await call('POST', '/tracking/update', { orderId, supplierId: x.partnerId, lat: 20.0, lng: 72.9 });
  assert.ok(t1.data.etaMinutes > 0);

  const chosen = await call('POST', '/alerts/' + alerts[0].alertId + '/choose', { option: 'switch_supplier' });
  assert.strictEqual(chosen.data.status, 'resolved');
  const orderNow = (await call('GET', '/orders/' + orderId)).data;
  assert.ok(orderNow.lines.some((l) => l.supplierId === z.partnerId && l.status === 'switched')); // the order moved to the backup

  // Ask AI: works even when Ollama is not running (keyword answers), and answers from the owner's own data.
  const st = (await call('GET', '/ai/status')).data;
  assert.strictEqual(typeof st.available, 'boolean');
  const ai = await call('POST', '/ai/chat', { message: 'Which of my orders are at risk?', language: 'en' });
  assert.strictEqual(ai.status, 200);
  assert.ok(ai.data.reply.length > 10);
  assert.strictEqual((await call('POST', '/ai/chat', { message: '   ' })).status, 400);

  const d = (await call('GET', '/dashboard')).data;
  assert.strictEqual(d.orders, 1);
  assert.strictEqual(d.totalOrderValueRupees, 600000);
  assert.strictEqual(d.valueAtRiskRupees, 390000);
  assert.strictEqual(d.decisionsMade, 1);
  assert.strictEqual(d.openAlerts, 1);
});
