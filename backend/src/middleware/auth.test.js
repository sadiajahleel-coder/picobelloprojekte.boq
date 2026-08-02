const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { requireSuperEmail, requireOwnerEmail } = require('./auth');

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
