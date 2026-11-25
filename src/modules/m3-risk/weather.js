'use strict';
// Weather source for M3. Owner: Vedant Kumar Sanodiya.
//
// Fake today: the weather comes from "demo overrides" that you set with POST /dev/weather.
// To use a real weather service, keep this function's shape and change only its inside:
//   forecastAt(store, lat, lng) -> { level: 'none' | 'yellow' | 'orange' | 'red', label: 'text for the alert' }
const { distanceKm } = require('../../lib/geo');

const LEVELS = ['none', 'yellow', 'orange', 'red'];

function forecastAt(store, lat, lng) {
  let worst = 'none';
  let label = '';
  for (const w of store.weather) {
    const inside = distanceKm(lat, lng, w.lat, w.lng) <= w.radiusKm;
    if (inside && LEVELS.indexOf(w.level) > LEVELS.indexOf(worst)) {
      worst = w.level;
      label = w.label || '';
    }
  }
  return { level: worst, label };
}

module.exports = { forecastAt, LEVELS };
