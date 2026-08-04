const { test, describe, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const { completeCall } = require('./authController');

const COMPANY_A = 'company-a';

function fakeReq(overrides = {}) {
  return { headers: {}, params: {}, ...overrides };
}

function fakeRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(payload) { res.body = payload; return res; },
  };
  return res;
}

describe('authController.completeCall', () => {
  let findOneAndUpdate;

  afterEach(() => {
    findOneAndUpdate?.mock.restore();
    delete process.env.UNLOCK_SECRET;
  });

  test('rejects requests without the correct unlock secret before touching the database', () => {
    process.env.UNLOCK_SECRET = 'right-secret';
    findOneAndUpdate = mock.method(User, 'findOneAndUpdate', () => Promise.resolve({}));

    const req = fakeReq({ headers: { 'x-unlock-secret': 'wrong-secret' }, params: { id: 'u1' } });
    const res = fakeRes();
    completeCall(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(findOneAndUpdate.mock.calls.length, 0);
  });

  test('scopes the update to the caller\'s own company -- a Company A admin cannot complete a Company B user\'s call', async () => {
    process.env.UNLOCK_SECRET = 'right-secret';
    findOneAndUpdate = mock.method(User, 'findOneAndUpdate', () => Promise.resolve({ _id: 'target-user' }));

    const req = fakeReq({
      headers: { 'x-unlock-secret': 'right-secret' },
      params: { id: 'target-user' },
      user: { companyId: COMPANY_A },
    });
    await completeCall(req, fakeRes());

    const filterUsed = findOneAndUpdate.mock.calls[0].arguments[0];
    assert.equal(filterUsed.companyId, COMPANY_A);
  });
});
