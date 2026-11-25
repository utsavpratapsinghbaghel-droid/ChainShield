# ChainShield integration contract

Every module talks to the others only through the objects and endpoints below.
Change this file only through a pull request that the Team Lead approves.

## Rules
- Money is a whole number of rupees (`valueRupees`, `valueAtRiskRupees`). No decimals, no symbols.
- Times are ISO 8601 with the India offset, e.g. `2026-11-20T11:49:00.000+05:30`. Due dates are `YYYY-MM-DD`.
- Places are decimal `lat` and `lng`.
- IDs are text with a prefix: `biz_001`, `par_001`, `ord_001`, `alt_001`.
- Risk levels are exactly `low`, `medium`, `high`.
- Everything is JSON. Errors look like `{ "error": "message" }`.
- Every endpoint except `/health` and `/auth/*` needs the header `Authorization: Bearer <token>`.

## Objects

**Business** `{ businessId, mobile, name, role, address, lat, lng, consentAt, language }`
`language` is `en` or `hi` and also sets the language of alerts. `consentAt` is the time the person agreed to data use (DPDP Act). It is set at first login and cannot be empty after that.
`role` is one of `business`, `supplier`, `transporter`, `client`.

**Partner** `{ partnerId, businessId, name, role, mobile, address, lat, lng, supplierType, consentAt }`
`role` is `supplier`, `client` or `transporter`. `supplierType` is `main` or `alternative` for suppliers and `null` for the others. Only main suppliers can be used in orders. `lat` and `lng` come from the city in the address and can be `null` if the city is not recognised. `consentAt` is when the partner gave their OTP, which is their consent to get WhatsApp messages.
`role` is `supplier` or `client`. `mobile` is a 10-digit Indian number.

**Order** `{ orderId, businessId, clientId, status, dueDate, bufferDays, lines, routePoints, createdAt }`
`lines` is a list of `{ supplierId, valueRupees, status }`. Line `status` is `ok`, `switched`, `rerouted` or `waiting`.
`routePoints` is a list of `{ label, lat, lng }`.

**RiskResult** `{ orderId, supplierId, location, riskLevel, delayDays, likelihood, valueAtRiskRupees, reason, checkedAt }`
`likelihood` is 0 to 1.

**LocationRequest** `{ requestId, orderId, transporterId, transporterName, status, requestedAt }`
`status` is `waiting` until the driver approves, then `shared`.

**Alert** `{ alertId, orderId, supplierId, backupSupplierId, severity, valueAtRiskRupees, message, options, status, chosen, savedRupees, createdAt }`
`options` is a list of `{ key, extraCostRupees }` with keys `switch_supplier`, `reroute`, `wait`. `status` is `open` or `resolved`.

**Tracking** `{ orderId, supplierId, lat, lng, distanceKm, etaMinutes, updatedAt }`

## Endpoints

| Module | Endpoint | Body or query | Returns |
|---|---|---|---|
| M1 | `POST /auth/otp` | `{ mobile }` | `{ sent }` |
| M1 | `POST /auth/register` | `{ mobile, otp, password, consent: true, role, name?, language? }` | `{ token, business }` |
| M1 | `POST /auth/reset-password` | `{ mobile, otp, password }` | `{ reset }` |
| M1 | `POST /auth/login` | `{ mobile, password }` then `POST /auth/verify` `{ mobile, otp }` | `{ otpRequired }` then `{ token, business }` |
| M1 | `GET /me`, `PUT /me` | profile fields | Business |
| M2 | `POST /partners/otp` | `{ mobile }` | `{ sent }` |
| M2 | `POST /partners` | `{ name, role, mobile, address, otp, supplierType? }` | Partner |
| M2 | `PUT /partners/:partnerId` | `{ supplierType?, name?, address? }` | Partner |
| M2 | `GET /partners?role=` | | Partner[] |
| M2 | `POST /orders` | `{ clientId, dueDate, lines, routePoints?, bufferDays? }` | Order |
| M2 | `GET /orders`, `GET /orders/:orderId` | | Order[] or Order |
| M3 | `POST /risk/evaluate` | `{ orderId }` | RiskResult[] |
| M3 | `GET /risk/:orderId` | | RiskResult[] |
| M8 | `GET /ai/status` | | `{ available, model, mode }` |
| M8 | `POST /ai/chat` | `{ message, language?, history? }` | `{ reply, source, model }` |
| M4 | `POST /tracking/request` | `{ orderId }` | LocationRequest |
| M4 | `POST /tracking/update` | `{ orderId, supplierId, lat, lng }` | Tracking |
| M4 | `GET /tracking/:orderId` | | Tracking[] |
| M5 | `POST /alerts` | `{ orderId }` | Alert[] |
| M5 | `GET /alerts?orderId=` | | Alert[] |
| M5 | `POST /alerts/:alertId/choose` | `{ option }` | Alert |
| M6 | `GET /dashboard` | | `{ orders, totalOrderValueRupees, valueAtRiskRupees, openAlerts, decisionsMade, savedRupees }` |
| dev | `POST /dev/weather`, `POST /dev/weather/clear` | pretend weather | count |

## Prototype defaults
- Test OTP is always `123456`. Demo login: mobile `9999999999`.
- Risk: weather level `none/yellow/orange/red` gives delay `0/1/3/5` days and likelihood `0/0.35/0.65/0.9`.
  Money is at risk only when the delay is longer than `bufferDays` (default 2).
- Option extra cost: switch supplier 6%, reroute 3%, wait 0%. These are placeholders.
