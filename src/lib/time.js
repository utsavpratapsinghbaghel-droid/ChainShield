'use strict';
// Rule from the contract: times are ISO 8601 with the Indian offset, e.g. 2026-11-20T11:49:00.000+05:30
function nowIst() {
  const shifted = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return shifted.toISOString().replace('Z', '+05:30');
}

module.exports = { nowIst };
