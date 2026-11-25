'use strict';
// Finds a rough map position from the address text, so the owner only types an address.
// Prototype: a small table of cities in West and Central India. A real geocoding service replaces this later.
const PLACES = {
  surat: [21.1702, 72.8311], vapi: [20.3893, 72.9106], valsad: [20.5992, 72.9342], bhiwandi: [19.2813, 73.0483],
  mumbai: [19.076, 72.8777], thane: [19.2183, 72.9781], pune: [18.5204, 73.8567], nashik: [19.9975, 73.7898],
  nagpur: [21.1458, 79.0882], aurangabad: [19.8762, 75.3433], kolhapur: [16.705, 74.2433], ahmedabad: [23.0225, 72.5714],
  vadodara: [22.3072, 73.1812], baroda: [22.3072, 73.1812], rajkot: [22.3039, 70.8022], bharuch: [21.7051, 72.9959],
  ankleshwar: [21.6264, 73.0152], navsari: [20.9467, 72.952], gandhinagar: [23.2156, 72.6369], indore: [22.7196, 75.8577],
  bhopal: [23.2599, 77.4126], ujjain: [23.1765, 75.7885], jabalpur: [23.1815, 79.9864], gwalior: [26.2183, 78.1828],
  raipur: [21.2514, 81.6296], bilaspur: [22.0797, 82.1409], lucknow: [26.8467, 80.9462], delhi: [28.6139, 77.209],
  jaipur: [26.9124, 75.7873], goa: [15.2993, 74.124], hyderabad: [17.385, 78.4867], bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946], chennai: [13.0827, 80.2707], kolkata: [22.5726, 88.3639], kanpur: [26.4499, 80.3319],
};

function findPlace(address) {
  const text = String(address || '').toLowerCase();
  for (const name of Object.keys(PLACES)) {
    if (text.includes(name)) return { lat: PLACES[name][0], lng: PLACES[name][1] };
  }
  return null;
}

module.exports = { findPlace };
