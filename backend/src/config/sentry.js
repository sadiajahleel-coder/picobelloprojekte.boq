const Sentry = require('@sentry/node');

// Manual error capture only — no auto-instrumentation/tracing, which would
// require restructuring how the app boots (Sentry.init() before requiring
// express, via a separate --require'd entry file). This app doesn't need
// APM, just "know when something breaks in production." Safe to call with
// no DSN — the SDK no-ops rather than throwing, same as this app's other
// optional external services (Cloudinary, AWS, Anthropic).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

module.exports = Sentry;
