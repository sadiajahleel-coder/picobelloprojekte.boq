'use strict';

// A generous ceiling on unbounded list endpoints -- high enough that no
// realistic legitimate company ever hits it, but bounded so a single query
// can't pull an unbounded number of documents into memory / over the wire.
// Not a substitute for real pagination; that's a separate, bigger UI change.
const LIST_SAFETY_CAP = 2000;

// Matches the "Up to 5 team members" claim advertised for the Basic plan on
// the landing page (Premium/Free-trial are unlimited) -- previously only
// enforced in the frontend (PlanGate.jsx), never on the server.
const BASIC_TEAM_MEMBER_LIMIT = 5;

// Mirrors frontend/src/components/PlanGate.jsx's TRIAL_DAYS/DEV_EMAIL exactly
// -- that's where this was previously (and only) enforced, client-side only.
// Keep both in sync if either changes.
const TRIAL_DAYS = 7;
const TRIAL_EXEMPT_EMAIL = 'tidan1023@gmail.com';

module.exports = { LIST_SAFETY_CAP, BASIC_TEAM_MEMBER_LIMIT, TRIAL_DAYS, TRIAL_EXEMPT_EMAIL };
