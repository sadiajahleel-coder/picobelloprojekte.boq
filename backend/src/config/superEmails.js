'use strict';

// Platform-owner emails -- not scoped to any one company. Used to gate the
// owner dashboard and waitlist admin view. Kept in its own module (rather
// than defined inline in authController.js) so route middleware can check
// it without importing a controller.
const SUPER_EMAILS = ['sadiajahleel@gmail.com'];

// Waitlist signups aren't scoped to any one company either, so access is a
// superset of SUPER_EMAILS: the platform owner(s), plus whoever's actually
// doing launch outreach (OWNER_EMAIL) -- not necessarily the same account.
const OWNER_EMAILS = [...SUPER_EMAILS, process.env.OWNER_EMAIL || 'tidan1023@gmail.com'];

module.exports = { SUPER_EMAILS, OWNER_EMAILS };
