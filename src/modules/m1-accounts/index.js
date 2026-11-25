'use strict';
// M1 Accounts and roles. Owner: Virat Sahu.
// Register: POST /auth/otp, then POST /auth/register (mobile, otp, password, role, name, language, consent: true)
// Log in:   POST /auth/login (mobile, password) sends an OTP, then POST /auth/verify (mobile, otp) gives the token
// Forgot password: POST /auth/otp, then POST /auth/reset-password (mobile, otp, password)
// Also: GET /me, PUT /me (name, address, lat, lng, role, language)
// Fake today: the OTP is always 123456 and nothing is sent. Real OTP needs an SMS provider.
const crypto = require('crypto');
const { HttpError, requireFields } = require('../../lib/http');
const { findPlace } = require('../../lib/places');

const ROLES = ['business', 'supplier', 'transporter', 'client'];
const LANGUAGES = ['en', 'hi'];
const TEST_OTP = '123456';
const MOBILE = /^[6-9]\d{9}$/;

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}
function passwordMatches(record, password) {
  if (!record) return false;
  const a = Buffer.from(hashPassword(password, record.salt), 'hex');
  const b = Buffer.from(record.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function checkMobile(body) {
  requireFields(body, ['mobile']);
  const mobile = String(body.mobile);
  if (!MOBILE.test(mobile)) throw new HttpError(400, 'Enter a 10-digit Indian mobile number');
  return mobile;
}
function openSession(store, business) {
  const token = store.newToken();
  store.sessions.set(token, business.businessId);
  return { token, business };
}

function register(router, store) {
  // Passwords are kept apart from the business record so they can never leak through the API.
  store.passwords = store.passwords || new Map();   // mobile -> { salt, hash }
  store.pendingLogins = store.pendingLogins || new Set(); // mobiles whose password was accepted, OTP still to enter

  router.post('/auth/otp', ({ body }) => {
    const mobile = checkMobile(body);
    store.otps.set(mobile, TEST_OTP);
    return { sent: true, note: 'Prototype: the OTP is always ' + TEST_OTP };
  }, { auth: false });

  // New account. A seeded demo account (no password yet) can be claimed the same way.
  router.post('/auth/register', ({ body }) => {
    const mobile = checkMobile(body);
    requireFields(body, ['otp', 'password']);
    if (store.passwords.has(mobile)) throw new HttpError(409, 'This mobile number is already registered. Please log in.');
    if (body.consent !== true) {
      // DPDP Act: personal data and location are used only after the person agrees.
      throw new HttpError(400, 'Consent is required: agree to the use of your mobile number and location (consent: true)');
    }
    if (String(body.password).length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    const role = body.role || 'business';
    if (!ROLES.includes(role)) throw new HttpError(400, 'role must be one of: ' + ROLES.join(', '));
    const language = body.language || 'en';
    if (!LANGUAGES.includes(language)) throw new HttpError(400, 'language must be one of: ' + LANGUAGES.join(', '));
    if (store.otps.get(mobile) !== String(body.otp)) throw new HttpError(401, 'Wrong or expired OTP');
    store.otps.delete(mobile);

    let business = store.findBusinessByMobile(mobile);
    if (!business) {
      business = { businessId: store.nextId('biz'), mobile, name: body.name || '', role, address: '', lat: null, lng: null };
      store.businesses.set(business.businessId, business);
    } else if (body.name) {
      business.name = body.name;
    }
    business.language = language;
    business.consentAt = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString('hex');
    store.passwords.set(mobile, { salt, hash: hashPassword(String(body.password), salt) });
    return openSession(store, business);
  }, { auth: false });

  // Log in, step 1: mobile and password. Step 2 is /auth/verify.
  router.post('/auth/login', ({ body }) => {
    const mobile = checkMobile(body);
    requireFields(body, ['password']);
    if (!passwordMatches(store.passwords.get(mobile), String(body.password))) {
      throw new HttpError(401, 'Wrong mobile number or password');
    }
    store.otps.set(mobile, TEST_OTP);
    store.pendingLogins.add(mobile);
    return { otpRequired: true, note: 'Prototype: the OTP is always ' + TEST_OTP };
  }, { auth: false });

  // Log in, step 2: the OTP.
  router.post('/auth/verify', ({ body }) => {
    const mobile = checkMobile(body);
    requireFields(body, ['otp']);
    if (!store.pendingLogins.has(mobile)) throw new HttpError(401, 'Enter your password first');
    if (store.otps.get(mobile) !== String(body.otp)) throw new HttpError(401, 'Wrong or expired OTP');
    store.otps.delete(mobile);
    store.pendingLogins.delete(mobile);
    return openSession(store, store.findBusinessByMobile(mobile));
  }, { auth: false });

  // Forgot password: send an OTP with POST /auth/otp, then set a new password here.
  router.post('/auth/reset-password', ({ body }) => {
    const mobile = checkMobile(body);
    requireFields(body, ['otp', 'password']);
    if (!store.passwords.has(mobile)) throw new HttpError(404, 'No account found for this mobile number. Please register.');
    if (String(body.password).length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (store.otps.get(mobile) !== String(body.otp)) throw new HttpError(401, 'Wrong or expired OTP');
    store.otps.delete(mobile);
    const salt = crypto.randomBytes(16).toString('hex');
    store.passwords.set(mobile, { salt, hash: hashPassword(String(body.password), salt) });
    return { reset: true };
  }, { auth: false });

  router.get('/me', ({ business }) => business);

  router.put('/me', ({ body, business }) => {
    if (body.role !== undefined && !ROLES.includes(body.role)) {
      throw new HttpError(400, 'role must be one of: ' + ROLES.join(', '));
    }
    if (body.language !== undefined && !LANGUAGES.includes(body.language)) {
      throw new HttpError(400, 'language must be one of: ' + LANGUAGES.join(', '));
    }
    ['name', 'address', 'lat', 'lng', 'role', 'language'].forEach((field) => {
      if (body[field] !== undefined) business[field] = body[field];
    });
    if (body.address !== undefined && body.lat === undefined) {
      const pos = findPlace(body.address);
      if (pos) { business.lat = pos.lat; business.lng = pos.lng; }
    }
    return business;
  });
}

module.exports = { register, ROLES, LANGUAGES };
