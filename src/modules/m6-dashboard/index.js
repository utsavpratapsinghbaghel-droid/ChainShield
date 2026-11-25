'use strict';
// M6 Risk dashboard. Owner: Utsav Pratap Singh Baghel.
// Provides: GET /dashboard
//
// This returns the numbers a dashboard needs. The target is SAP Analytics Cloud;
// until it is available, the app shows these numbers itself.
function register(router, store) {
  router.get('/dashboard', ({ business }) => {
    const orders = [...store.orders.values()].filter((o) => o.businessId === business.businessId);
    const ids = new Set(orders.map((o) => o.orderId));

    let totalOrderValueRupees = 0;
    orders.forEach((o) => o.lines.forEach((l) => { totalOrderValueRupees += l.valueRupees; }));

    let valueAtRiskRupees = 0;
    for (const [orderId, results] of store.risks) {
      if (ids.has(orderId)) results.forEach((r) => { valueAtRiskRupees += r.valueAtRiskRupees; });
    }

    const alerts = [...store.alerts.values()].filter((a) => ids.has(a.orderId));
    return {
      orders: orders.length,
      totalOrderValueRupees,
      valueAtRiskRupees,
      openAlerts: alerts.filter((a) => a.status === 'open').length,
      decisionsMade: alerts.filter((a) => a.status === 'resolved').length,
      savedRupees: alerts.reduce((sum, a) => sum + a.savedRupees, 0),
    };
  });
}

module.exports = { register };
