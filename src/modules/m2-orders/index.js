'use strict';
// M2 Orders and partners. Owner: Virat Sahu.
// Provides: POST /partners/otp, POST /partners, PUT /partners/:partnerId, GET /partners, POST /orders, GET /orders, GET /orders/:orderId
// A partner is a supplier, client or transporter. Each is added with their own OTP, which is their consent to get WhatsApp messages.
// Suppliers are either main (used in orders) or alternative (kept as backups).
const { HttpError, requireFields, requireNumber } = require('../../lib/http');
const { ownedOrder, ownedPartner } = require('../../lib/guards');
const { nowIst } = require('../../lib/time');

const MOBILE = /^[6-9]\d{9}$/;

const { findPlace } = require('../../lib/places');
const ROLES = ['supplier', 'client', 'transporter'];
const SUPPLIER_TYPES = ['main', 'alternative'];
const TEST_OTP = '123456';

function register(router, store) {
  store.partnerOtps = store.partnerOtps || new Map(); // "businessId:mobile" -> otp

  // Step 1 of adding a supplier, client or transporter: send them an OTP.
  // Their OTP is their consent to get WhatsApp messages from ChainShield. Prototype: always 123456.
  router.post('/partners/otp', ({ body, business }) => {
    requireFields(body, ['mobile']);
    if (!MOBILE.test(String(body.mobile))) throw new HttpError(400, 'Enter a 10-digit Indian mobile number');
    store.partnerOtps.set(business.businessId + ':' + body.mobile, TEST_OTP);
    return { sent: true, note: 'Prototype: the OTP is always ' + TEST_OTP };
  });

  // Step 2: add the partner with the OTP they gave.
  router.post('/partners', ({ body, business }) => {
    requireFields(body, ['name', 'role', 'mobile', 'address', 'otp']);
    if (!ROLES.includes(body.role)) throw new HttpError(400, 'role must be one of: ' + ROLES.join(', '));
    if (!MOBILE.test(String(body.mobile))) throw new HttpError(400, 'Enter a 10-digit Indian mobile number');
    const key = business.businessId + ':' + body.mobile;
    if (store.partnerOtps.get(key) !== String(body.otp)) throw new HttpError(401, 'Wrong or expired OTP. Their OTP is their consent to receive WhatsApp messages.');
    const duplicate = [...store.partners.values()].find((p) => p.businessId === business.businessId && p.mobile === String(body.mobile) && p.role === body.role);
    if (duplicate) throw new HttpError(409, 'You already added this mobile number as a ' + body.role);
    store.partnerOtps.delete(key);

    // Position: use lat and lng if sent, otherwise find the city in the address.
    let pos = null;
    if (typeof body.lat === 'number' && typeof body.lng === 'number') pos = { lat: body.lat, lng: body.lng };
    else pos = findPlace(body.address);
    let supplierType = null;
    if (body.role === 'supplier') {
      supplierType = body.supplierType || 'main';
      if (!SUPPLIER_TYPES.includes(supplierType)) throw new HttpError(400, 'supplierType must be main or alternative');
    }
    const partner = {
      partnerId: store.nextId('par'),
      businessId: business.businessId,
      name: body.name,
      role: body.role,
      mobile: String(body.mobile),
      address: body.address,
      lat: pos ? pos.lat : null,
      lng: pos ? pos.lng : null,
      supplierType,
      consentAt: nowIst(),
    };
    store.partners.set(partner.partnerId, partner);
    return partner;
  });

  // Change a supplier between main and alternative, or fix the name or address.
  router.put('/partners/:partnerId', ({ params, body, business }) => {
    const partner = ownedPartner(store, business, params.partnerId);
    if (body.supplierType !== undefined) {
      if (partner.role !== 'supplier') throw new HttpError(400, 'Only suppliers can be main or alternative');
      if (!SUPPLIER_TYPES.includes(body.supplierType)) throw new HttpError(400, 'supplierType must be main or alternative');
      partner.supplierType = body.supplierType;
    }
    if (body.name !== undefined) partner.name = body.name;
    if (body.address !== undefined) {
      partner.address = body.address;
      const pos = findPlace(body.address);
      if (pos) { partner.lat = pos.lat; partner.lng = pos.lng; }
    }
    return partner;
  });

  router.get('/partners', ({ business, query }) =>
    [...store.partners.values()].filter((p) => p.businessId === business.businessId && (!query.role || p.role === query.role)));

  router.post('/orders', ({ body, business }) => {
    requireFields(body, ['clientId', 'dueDate', 'lines']);
    ownedPartner(store, business, body.clientId, 'client');
    if (!Array.isArray(body.lines) || body.lines.length === 0) throw new HttpError(400, 'lines must list at least one supplier');
    const lines = body.lines.map((line) => {
      requireFields(line, ['supplierId', 'valueRupees']);
      const sup = ownedPartner(store, business, line.supplierId, 'supplier');
      if (sup.supplierType !== 'main') throw new HttpError(400, sup.name + ' is an alternative (backup) supplier. Mark it as a main supplier to use it in an order.');
      requireNumber(line.valueRupees, 'valueRupees');
      if (line.valueRupees <= 0) throw new HttpError(400, 'valueRupees must be more than 0');
      return { supplierId: line.supplierId, valueRupees: line.valueRupees, status: 'ok' };
    });
    const routePoints = (body.routePoints || []).map((p) => {
      requireFields(p, ['label', 'lat', 'lng']);
      return { label: p.label, lat: requireNumber(p.lat, 'lat'), lng: requireNumber(p.lng, 'lng') };
    });
    const order = {
      orderId: store.nextId('ord'),
      businessId: business.businessId,
      clientId: body.clientId,
      status: 'placed',
      dueDate: body.dueDate,
      bufferDays: typeof body.bufferDays === 'number' ? body.bufferDays : 2,
      lines,
      routePoints,
      createdAt: nowIst(),
    };
    store.orders.set(order.orderId, order);
    return order;
  });

  router.get('/orders', ({ business }) =>
    [...store.orders.values()].filter((o) => o.businessId === business.businessId));

  router.get('/orders/:orderId', ({ params, business }) => ownedOrder(store, business, params.orderId));
}

module.exports = { register };
