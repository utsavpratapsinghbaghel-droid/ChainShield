'use strict';
// M5 Alerts and actions. Owner: Yuvraj Singh.
// Provides: POST /alerts { orderId }     GET /alerts?orderId=     POST /alerts/:alertId/choose { option }
//
// Fake today: alerts are saved, not sent. Real versions send the message by WhatsApp or SMS.
// The extra-cost percentages below are placeholders. Keep the Alert fields as in contract/CONTRACT.md.
const { HttpError, requireFields } = require('../../lib/http');
const { ownedOrder } = require('../../lib/guards');
const { nowIst } = require('../../lib/time');
const { forecastAt, LEVELS } = require('../m3-risk/weather');
const { distanceKm } = require('../../lib/geo');

const OPTION_COST = { switch_supplier: 0.06, reroute: 0.03, wait: 0 };
const LINE_STATUS = { switch_supplier: 'switched', reroute: 'rerouted', wait: 'waiting' };

// Best alternative supplier: the one with the calmest weather, then the one closest to the client.
function pickBackup(store, business, order, failing) {
  const client = store.partners.get(order.clientId);
  const ranked = [...store.partners.values()]
    .filter((p) => p.businessId === business.businessId && p.role === 'supplier' && p.supplierType === 'alternative' && p.partnerId !== failing.partnerId)
    .map((p) => {
      const located = typeof p.lat === 'number' && typeof p.lng === 'number';
      const level = located ? forecastAt(store, p.lat, p.lng).level : 'yellow';
      const km = located && client && typeof client.lat === 'number' ? distanceKm(p.lat, p.lng, client.lat, client.lng) : 99999;
      return { p, level, km };
    })
    .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.km - b.km);
  return ranked.length ? ranked[0] : null;
}

function register(router, store) {
  // Makes one alert for every supplier line that has money at risk. Run risk evaluation first.
  router.post('/alerts', ({ body, business }) => {
    requireFields(body, ['orderId']);
    const order = ownedOrder(store, business, body.orderId);
    const risks = store.risks.get(order.orderId);
    if (!risks) throw new HttpError(409, 'Evaluate the risk first: POST /risk/evaluate');

    // Replace older open alerts for this order so the owner is not told twice.
    for (const [id, a] of store.alerts) if (a.orderId === order.orderId && a.status === 'open') store.alerts.delete(id);

    const created = [];
    for (const r of risks.filter((x) => x.valueAtRiskRupees > 0)) {
      const supplier = store.partners.get(r.supplierId);
      const backup = pickBackup(store, business, order, supplier);
      const backupText = backup
        ? ' Suggested backup: ' + backup.p.name + (backup.level === 'none' ? '.' : ' (it also has a ' + backup.level + ' weather alert).')
        : ' No alternative supplier is saved yet. Add one in the Suppliers tab.';
      const alert = {
        alertId: store.nextId('alt'),
        orderId: order.orderId,
        supplierId: r.supplierId,
        backupSupplierId: backup ? backup.p.partnerId : null,
        severity: r.riskLevel,
        valueAtRiskRupees: r.valueAtRiskRupees,
        message: supplier.name + ': ' + r.riskLevel + ' risk. ₹' + r.valueAtRiskRupees + ' of this order is at risk (' + r.delayDays + '-day delay expected). ' + r.reason + '.' + backupText,
        options: Object.keys(OPTION_COST).map((key) => ({ key, extraCostRupees: Math.round(r.valueAtRiskRupees * OPTION_COST[key]) })),
        status: 'open',
        chosen: null,
        savedRupees: 0,
        createdAt: nowIst(),
      };
      store.alerts.set(alert.alertId, alert);
      created.push(alert);
    }
    return created;
  });

  router.get('/alerts', ({ query, business }) =>
    [...store.alerts.values()].filter((a) => {
      const order = store.orders.get(a.orderId);
      return order && order.businessId === business.businessId && (!query.orderId || a.orderId === query.orderId);
    }));

  // The owner picks an option. This updates the order through the M2 data.
  router.post('/alerts/:alertId/choose', ({ params, body, business }) => {
    requireFields(body, ['option']);
    const alert = store.alerts.get(params.alertId);
    if (!alert) throw new HttpError(404, 'Alert not found');
    const order = ownedOrder(store, business, alert.orderId);
    if (alert.status !== 'open') throw new HttpError(409, 'This alert already has a decision');
    const option = alert.options.find((o) => o.key === body.option);
    if (!option) throw new HttpError(400, 'option must be one of: ' + alert.options.map((o) => o.key).join(', '));

    const line = order.lines.find((l) => l.supplierId === alert.supplierId);
    line.status = LINE_STATUS[option.key];
    if (option.key === 'switch_supplier' && alert.backupSupplierId) { line.switchedFrom = line.supplierId; line.supplierId = alert.backupSupplierId; }
    alert.status = 'resolved';
    alert.chosen = option.key;
    // Placeholder rule: switching or rerouting protects the order, waiting does not.
    alert.savedRupees = option.key === 'wait' ? 0 : Math.max(0, alert.valueAtRiskRupees - option.extraCostRupees);
    alert.resolvedAt = nowIst();
    return alert;
  });
}

module.exports = { register };
