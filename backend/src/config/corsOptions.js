'use strict';

// CLIENT_URL is documented (MASTER_DOCUMENT.md) as the exact production
// frontend URL, so origin matching only ever needs to check against this
// explicit list -- no prefix or wildcard match. The previous version used
// origin.startsWith(allowedOrigin), which let
// https://<CLIENT_URL>.attacker.com through, and origin.endsWith('.onrender.com'),
// which trusted any app on Render's shared public host, not just this one.
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

function checkOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error(`CORS: origin ${origin} not allowed`));
}

module.exports = { allowedOrigins, checkOrigin };
