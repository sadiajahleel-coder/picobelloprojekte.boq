const { test, describe, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Sentry = require('../config/sentry');
const errorHandler = require('./errorHandler');

function fakeReq() {
  return { method: 'GET', path: '/api/test' };
}

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(payload) { res.body = payload; return res; },
  };
  return res;
}

describe('errorHandler', () => {
  let captureException;

  beforeEach(() => {
    captureException = mock.method(Sentry, 'captureException', () => {});
  });
  afterEach(() => {
    captureException.mock.restore();
  });

  test('reports genuinely unexpected 500 errors to Sentry', () => {
    const err = new Error('database exploded');
    errorHandler(err, fakeReq(), fakeRes(), () => {});
    assert.equal(captureException.mock.calls.length, 1);
    assert.equal(captureException.mock.calls[0].arguments[0], err);
  });

  test('does not report a Mongoose CastError (expected 400, not a bug)', () => {
    const err = new Error('bad id');
    err.name = 'CastError';
    errorHandler(err, fakeReq(), fakeRes(), () => {});
    assert.equal(captureException.mock.calls.length, 0);
  });

  test('does not report a Mongoose ValidationError', () => {
    const err = new Error('invalid');
    err.name = 'ValidationError';
    err.errors = { field: { path: 'field', message: 'required' } };
    errorHandler(err, fakeReq(), fakeRes(), () => {});
    assert.equal(captureException.mock.calls.length, 0);
  });

  test('does not report a JWT error (expected 401)', () => {
    const err = new Error('bad token');
    err.name = 'JsonWebTokenError';
    errorHandler(err, fakeReq(), fakeRes(), () => {});
    assert.equal(captureException.mock.calls.length, 0);
  });

  test('does not report a duplicate-key error (expected 409)', () => {
    const err = new Error('dup');
    err.code = 11000;
    errorHandler(err, fakeReq(), fakeRes(), () => {});
    assert.equal(captureException.mock.calls.length, 0);
  });

  test('production mode hides the real message for 500s but still logs/reports it', () => {
    process.env.NODE_ENV = 'production';
    try {
      const err = new Error('leaked secret path');
      const res = fakeRes();
      errorHandler(err, fakeReq(), res, () => {});
      assert.equal(res.statusCode, 500);
      assert.equal(res.body.message, 'An unexpected error occurred. Please try again later.');
      assert.equal(captureException.mock.calls.length, 1);
    } finally {
      delete process.env.NODE_ENV;
    }
  });
});
