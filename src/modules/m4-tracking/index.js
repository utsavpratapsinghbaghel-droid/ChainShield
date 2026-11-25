'use strict';
// M4 Tracking and ETA. Owner: to be decided (suggested: Siddhant Agnihotri).
// Provides: POST /tracking/request { orderId }     POST /tracking/update { orderId, supplierId, lat, lng }      GET /tracking/:orderId
//
// Fake today: the driver's position is sent in by hand, and the arrival time is distance / 40 km/h.
// Real versions: a driver tracking link or live-location source, and a maps routing service for the arrival time.
// Keep the Tracking fields as in contract/CONTRACT.md.
const { HttpError, requireFields, requireNumber } = require('../../lib/http');
const { ownedOrder } = require('../../lib/guards');
const { distanceKm, etaMinutes } = require('../../lib/geo');
const { nowIst } = require('../../lib/time');

function register(router, store) {
  // The owner taps "Request Driver Live Location". The driver (a saved transporter) gets a WhatsApp
  // message with an Approve button, and when they approve, their location arrives in the chat.
  // Fake today: the request is saved with status "waiting" and nothing is sent.
  store.locationRequests = store.locationRequests || new Map();
  router.post('/tracking/request', ({ body, business }) => {
    requireFields(body, ['orderId']);
    const order = ownedOrder(store, business, body.orderId);
    const driver = [...store.partners.values()].find((p) => p.businessId === business.businessId && p.role === 'transporter');
    if (!driver) throw new HttpError(400, 'Add a transporter in Chain Details first, so we know whom to ask for the location.');
    const request = {
      requestId: store.nextId('req'),
      orderId: order.orderId,
      transporterId: driver.partnerId,
      transporterName: driver.name,
      status: 'waiting',
      requestedAt: nowIst(),
    };
    store.locationRequests.set(request.requestId, request);
    return request;
  });

  router.post('/tracking/update', ({ body, business }) => {
    requireFields(body, ['orderId', 'supplierId', 'lat', 'lng']);
    const order = ownedOrder(store, business, body.orderId);
    requireNumber(body.lat, 'lat');
    requireNumber(body.lng, 'lng');
    const client = store.partners.get(order.clientId);
    const km = distanceKm(body.lat, body.lng, client.lat, client.lng);
    const entry = {
      orderId: order.orderId,
      supplierId: body.supplierId,
      lat: body.lat,
      lng: body.lng,
      distanceKm: Math.round(km * 10) / 10,
      etaMinutes: etaMinutes(km),
      updatedAt: nowIst(),
    };
    const list = (store.tracking.get(order.orderId) || []).filter((t) => t.supplierId !== body.supplierId);
    list.push(entry);
    store.tracking.set(order.orderId, list);
    return entry;
  });

  router.get('/tracking/:orderId', ({ params, business }) => {
    ownedOrder(store, business, params.orderId);
    return store.tracking.get(params.orderId) || [];
  });
}

module.exports = { register };
