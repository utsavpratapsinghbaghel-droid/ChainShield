'use strict';
// M3 Weather and risk AI. Owner: Vedant Kumar Sanodiya.
// Provides: POST /risk/evaluate { orderId }  ->  RiskResult[]      GET /risk/:orderId
//
// Fake today: simple rules turn a weather level into a delay and a likelihood.
// Replace the rules with your model, but keep the RiskResult fields exactly as in contract/CONTRACT.md.
const { HttpError, requireFields } = require('../../lib/http');
const { ownedOrder } = require('../../lib/guards');
const { nowIst } = require('../../lib/time');
const { forecastAt, LEVELS } = require('./weather');

// weather level -> expected delay (days), likelihood (0 to 1), risk level
const RULES = {
  none: { delayDays: 0, likelihood: 0, riskLevel: 'low' },
  yellow: { delayDays: 1, likelihood: 0.35, riskLevel: 'low' },
  orange: { delayDays: 3, likelihood: 0.65, riskLevel: 'medium' },
  red: { delayDays: 5, likelihood: 0.9, riskLevel: 'high' },
};

function evaluateOrder(store, order) {
  const client = store.partners.get(order.clientId);
  return order.lines.map((line) => {
    const supplier = store.partners.get(line.supplierId);
    // Points the weather is checked at: supplier address, every route point, client address.
    const points = [
      { label: supplier.name + ' (supplier address)', lat: supplier.lat, lng: supplier.lng },
      ...order.routePoints,
      { label: client.name + ' (client address)', lat: client.lat, lng: client.lng },
    ];
    let worst = { level: 'none', label: '', point: null };
    for (const p of points.filter((q) => typeof q.lat === 'number' && typeof q.lng === 'number')) {
      const f = forecastAt(store, p.lat, p.lng);
      if (LEVELS.indexOf(f.level) > LEVELS.indexOf(worst.level)) worst = { level: f.level, label: f.label, point: p };
    }
    const rule = RULES[worst.level];
    // An order is only at risk if the expected delay is longer than the buffer the owner has.
    const late = rule.delayDays > order.bufferDays;
    const valueAtRiskRupees = late ? Math.round(line.valueRupees * rule.likelihood) : 0;
    let reason = 'No weather alert at the supplier, along the route or at the client';
    if (worst.level !== 'none') {
      reason = worst.level + ' weather alert near ' + worst.point.label + (worst.label ? ' (' + worst.label + ')' : '') + ': ' +
        (late
          ? 'the expected ' + rule.delayDays + '-day delay is longer than the ' + order.bufferDays + '-day buffer'
          : 'the expected ' + rule.delayDays + '-day delay fits inside the ' + order.bufferDays + '-day buffer');
    }
    return {
      orderId: order.orderId,
      supplierId: line.supplierId,
      location: worst.point ? worst.point.label : 'No alert on the route',
      riskLevel: rule.riskLevel,
      delayDays: rule.delayDays,
      likelihood: rule.likelihood,
      valueAtRiskRupees,
      reason,
      checkedAt: nowIst(),
    };
  });
}

function register(router, store) {
  router.post('/risk/evaluate', ({ body, business }) => {
    requireFields(body, ['orderId']);
    const order = ownedOrder(store, business, body.orderId);
    const results = evaluateOrder(store, order);
    store.risks.set(order.orderId, results);
    return results;
  });

  router.get('/risk/:orderId', ({ params, business }) => {
    ownedOrder(store, business, params.orderId);
    const results = store.risks.get(params.orderId);
    if (!results) throw new HttpError(404, 'No risk result yet. Call POST /risk/evaluate first');
    return results;
  });
}

module.exports = { register, evaluateOrder };
