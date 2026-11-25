'use strict';
// Distance and arrival-time helpers (used by M3 and M4).

// Straight-line distance in km between two points (haversine formula).
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Prototype assumption: a truck averages 40 km/h. Replace with a maps routing service later.
const AVERAGE_SPEED_KMH = 40;

function etaMinutes(km) {
  return Math.round((km / AVERAGE_SPEED_KMH) * 60);
}

module.exports = { distanceKm, etaMinutes, AVERAGE_SPEED_KMH };
