'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

function createStore(options) {
  const store = {
    counters: {},
    sessions: new Map(),
otps: new Map(),
passwords: new Map(),
pendingLogins: new Set(),
    businesses: new Map(),
    partners: new Map(),
    orders: new Map(),
    risks: new Map(),
    alerts: new Map(),
    tracking: new Map(),
    weather: [],

    nextId(prefix) {
      this.counters[prefix] = (this.counters[prefix] || 0) + 1;
      return prefix + '_' + String(this.counters[prefix]).padStart(3, '0');
    },

    newToken() {
      return 'tok_' + crypto.randomBytes(12).toString('hex');
    },

    findBusinessByMobile(mobile) {
      for (const b of this.businesses.values()) {
        if (b.mobile === mobile) return b;
      }
      return null;
    },

    exportState() {
      return {
        counters: this.counters,
        businesses: [...this.businesses.entries()],
        partners: [...this.partners.entries()],
        orders: [...this.orders.entries()],
        risks: [...this.risks.entries()],
        alerts: [...this.alerts.entries()],
        tracking: [...this.tracking.entries()],
        passwords: [...this.passwords.entries()],
        weather: this.weather
      };
    },

    importState(snapshot) {
      if (!snapshot) return;

      this.counters = snapshot.counters || {};

      this.businesses = new Map(snapshot.businesses || []);
      this.partners = new Map(snapshot.partners || []);
      this.orders = new Map(snapshot.orders || []);
      this.risks = new Map(snapshot.risks || []);
      this.alerts = new Map(snapshot.alerts || []);
      this.tracking = new Map(snapshot.tracking || []);
      this.passwords = new Map(snapshot.passwords || []);
      this.weather = snapshot.weather || [];

     // Temporary authentication state is intentionally not restored.
this.sessions = new Map();
this.otps = new Map();
this.pendingLogins = new Set();
    }
  };

  if (options && options.seed) {
    const file = path.join(__dirname, '..', 'contract', 'sample-data.json');
    const sample = JSON.parse(fs.readFileSync(file, 'utf8'));

    sample.businesses.forEach((b) => store.businesses.set(b.businessId, b));
    sample.partners.forEach((p) => store.partners.set(p.partnerId, p));
    sample.orders.forEach((o) => store.orders.set(o.orderId, o));

    Object.assign(store.counters, sample.counters);
  }

  return store;
}

module.exports = { createStore };
