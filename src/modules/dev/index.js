'use strict';
// Demo and test helpers. Remove or protect these before any real use.
// POST /dev/weather { lat, lng, radiusKm, level, label }   pretends bad weather at a place
// POST /dev/weather/clear                                  removes all pretend weather
const { HttpError, requireFields, requireNumber } = require('../../lib/http');
const { LEVELS } = require('../m3-risk/weather');

function register(router, store) {
  router.post('/dev/weather', ({ body }) => {
    requireFields(body, ['lat', 'lng', 'radiusKm', 'level']);
    requireNumber(body.lat, 'lat');
    requireNumber(body.lng, 'lng');
    requireNumber(body.radiusKm, 'radiusKm');
    if (!LEVELS.includes(body.level)) throw new HttpError(400, 'level must be one of: ' + LEVELS.join(', '));
    store.weather.push({ lat: body.lat, lng: body.lng, radiusKm: body.radiusKm, level: body.level, label: body.label || '' });
    return { weatherOverrides: store.weather.length };
  });

  router.post('/dev/weather/clear', () => {
    store.weather.length = 0;
    return { weatherOverrides: 0 };
  });
}

module.exports = { register };
