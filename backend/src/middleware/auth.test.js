const { test, describe, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireSuperEmail, requireOwnerEmail, isTrialExpired, authenticate } = require('./auth');

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(payload) { res.body = payload; return res; },
  };
  return res;
}

describe('requireSuperEmail', () => {
  test('blocks a non-superadmin email with 403, never calls next()', () => {
    const req = { user: { email: 'random-admin@example.com' } };
    const res = fakeRes();
    let nextCalled = false;
    requireSuperEmail(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  test('allows the configured superadmin email through', () => {
    const req = { user: { email: 'sadiajahleel@gmail.com' } };
    const res = fakeRes();
    let nextCalled = false;
    requireSuperEmail(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
  });
});

describe('requireOwnerEmail', () => {
  test('blocks an arbitrary email', () => {
    const req = { user: { email: 'nobody@example.com' } };
    const res = fakeRes();
    let nextCalled = false;
    requireOwnerEmail(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  test('allows the superadmin email through too (OWNER_EMAILS is a superset)', () => {
    const req = { user: { email: 'sadiajahleel@gmail.com' } };
    const res = fakeRes();
    let nextCalled = false;
    requireOwnerEmail(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });
});

describe('isTrialExpired', () => {
  test('false for a non-free plan, regardless of how old the account is', () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    assert.equal(isTrialExpired({ plan: 'basic', createdAt: oldDate, email: 'x@y.com' }), false);
    assert.equal(isTrialExpired({ plan: 'premium', createdAt: oldDate, email: 'x@y.com' }), false);
  });

  test('false for a free account still inside the 7-day window', () => {
    const recent = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    assert.equal(isTrialExpired({ plan: 'free', createdAt: recent, email: 'x@y.com' }), false);
  });

  test('true for a free account past the 7-day window', () => {
    const old = new Date(Date.now() - 8 * 24 * 3600 * 1000);
    assert.equal(isTrialExpired({ plan: 'free', createdAt: old, email: 'x@y.com' }), true);
  });

  test('always false for the exempt dev email, even long past the window', () => {
    const old = new Date(Date.now() - 365 * 24 * 3600 * 1000);
    assert.equal(isTrialExpired({ plan: 'free', createdAt: old, email: 'tidan1023@gmail.com' }), false);
  });
});

describe('authenticate — trial-expiry gate', () => {
  let jwtVerify, findById;

  afterEach(() => {
    jwtVerify?.mock.restore();
    findById?.mock.restore();
  });

  function fakeReq(overrides = {}) {
    return { headers: { authorization: 'Bearer faketoken' }, baseUrl: '/api/auth', path: '/', ...overrides };
  }

  test('blocks an expired free-trial user with 402, req.user is never set, next() is never called', async () => {
    jwtVerify = mock.method(jwt, 'verify', () => ({ id: 'u1' }));
    const oldDate = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    findById = mock.method(User, 'findById', () => Promise.resolve({
      _id: 'u1', isActive: true, plan: 'free', createdAt: oldDate, email: 'x@y.com', companyId: 'c1',
    }));

    const req = fakeReq({ baseUrl: '/api/projects', path: '/' });
    const res = fakeRes();
    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 402);
    assert.equal(res.body.trialExpired, true);
    assert.equal(nextCalled, false);
    assert.equal(req.user, undefined);
  });

  test('still allows GET/DELETE on /me even with an expired trial', async () => {
    jwtVerify = mock.method(jwt, 'verify', () => ({ id: 'u1' }));
    const oldDate = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    findById = mock.method(User, 'findById', () => Promise.resolve({
      _id: 'u1', isActive: true, plan: 'free', createdAt: oldDate, email: 'x@y.com', companyId: 'c1',
    }));

    const req = fakeReq({ baseUrl: '/api/auth', path: '/me' });
    const res = fakeRes();
    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.user._id, 'u1');
  });

  test('does not block a route that merely ends with "/auth" text but is a different router (baseUrl exact-suffix match only matters for real /auth mount)', async () => {
    // Sanity check that an unrelated path also named /me on a non-auth
    // router is NOT exempt -- exemption requires baseUrl to end with /auth.
    jwtVerify = mock.method(jwt, 'verify', () => ({ id: 'u1' }));
    const oldDate = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    findById = mock.method(User, 'findById', () => Promise.resolve({
      _id: 'u1', isActive: true, plan: 'free', createdAt: oldDate, email: 'x@y.com', companyId: 'c1',
    }));

    const req = fakeReq({ baseUrl: '/api/projects', path: '/me' });
    const res = fakeRes();
    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 402);
    assert.equal(nextCalled, false);
  });

  test('allows a free-trial user who is still within the window on any route', async () => {
    jwtVerify = mock.method(jwt, 'verify', () => ({ id: 'u1' }));
    const recent = new Date(Date.now() - 1 * 24 * 3600 * 1000);
    findById = mock.method(User, 'findById', () => Promise.resolve({
      _id: 'u1', isActive: true, plan: 'free', createdAt: recent, email: 'x@y.com', companyId: 'c1',
    }));

    const req = fakeReq({ baseUrl: '/api/projects', path: '/' });
    const res = fakeRes();
    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
  });

  test('never blocks a paid-plan user regardless of account age', async () => {
    jwtVerify = mock.method(jwt, 'verify', () => ({ id: 'u1' }));
    const veryOld = new Date(Date.now() - 400 * 24 * 3600 * 1000);
    findById = mock.method(User, 'findById', () => Promise.resolve({
      _id: 'u1', isActive: true, plan: 'premium', createdAt: veryOld, email: 'x@y.com', companyId: 'c1',
    }));

    const req = fakeReq({ baseUrl: '/api/projects', path: '/' });
    const res = fakeRes();
    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
  });
});
