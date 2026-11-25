'use strict';
// Checks shared by several modules.
const { HttpError } = require('./http');

// Returns the order if it belongs to the logged-in business, otherwise a 404.
function ownedOrder(store, business, orderId) {
  const order = store.orders.get(orderId);
  if (!order || order.businessId !== business.businessId) throw new HttpError(404, 'Order not found: ' + orderId);
  return order;
}

function ownedPartner(store, business, partnerId, role) {
  const partner = store.partners.get(partnerId);
  if (!partner || partner.businessId !== business.businessId) throw new HttpError(400, 'Unknown ' + (role || 'partner') + ': ' + partnerId);
  if (role && partner.role !== role) throw new HttpError(400, partnerId + ' is not a ' + role);
  return partner;
}

module.exports = { ownedOrder, ownedPartner };
