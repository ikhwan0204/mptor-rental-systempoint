const rateLimit = require('express-rate-limit');

// Untuk login/register/forgot-password — stricter, elak brute-force & spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percubaan. Sila cuba lagi selepas 15 minit.' },
});

// Untuk keseluruhan API — elak cost melambung dari traffic tak normal
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Sila cuba lagi sebentar.' },
});

module.exports = { authLimiter, generalLimiter };