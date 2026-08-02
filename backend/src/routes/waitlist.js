const express = require('express');
const router = express.Router();
const { create, list } = require('../controllers/waitlistController');
const { authenticate, requireOwnerEmail } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { zodValidate, schemas } = require('../middleware/zodValidate');

// Public — landing page signup form
router.post('/', authLimiter, zodValidate(schemas.waitlist), create);

// Platform owner only — not scoped to a company
router.get('/', authenticate, requireOwnerEmail, list);

module.exports = router;
