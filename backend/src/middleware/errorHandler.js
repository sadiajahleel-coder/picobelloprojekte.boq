'use strict';
const logger = require('../utils/logger');
const Sentry = require('../config/sentry');

// Safe messages to expose in production for common error types
const SAFE_MESSAGES = {
  CastError:       'Invalid resource identifier',
  ValidationError: 'Validation failed',
  JsonWebTokenError:    'Invalid token',
  TokenExpiredError:    'Token has expired',
  SyntaxError:     'Malformed request body',
};

function errorHandler(err, req, res, _next) {
  const statusCode   = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Always log the real error server-side (never suppress)
  logger.error(`[${req.method}] ${req.path} → ${statusCode}`, {
    error: err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });

  // Mongoose CastError (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: SAFE_MESSAGES.CastError });
  }

  // Mongoose ValidationError — extract field messages cleanly
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ message: SAFE_MESSAGES.ValidationError, errors });
  }

  // MongoDB duplicate-key error
  if (err.code === 11000) {
    return res.status(409).json({ message: 'A record with that value already exists' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: SAFE_MESSAGES[err.name] });
  }

  // Body parse error (malformed JSON)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: SAFE_MESSAGES.SyntaxError });
  }

  // Everything past this point is a genuinely unhandled error type — not
  // one of the expected 4xx cases above, which all returned already.
  if (statusCode >= 500) {
    Sentry.captureException(err);
  }

  // In production: never leak internal error messages for 5xx responses
  const message = isProduction && statusCode >= 500
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal server error';

  res.status(statusCode).json({ message });
}

module.exports = errorHandler;
