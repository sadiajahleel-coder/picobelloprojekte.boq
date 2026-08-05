const { test, describe, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const email = require('../utils/email');
const whatsapp = require('../utils/whatsapp');
const { completeCall, inviteMember } = require('./authController');

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

describe('authController.inviteMember — Basic-tier team-member cap', () => {
  let countDocuments, findOne, create, sendTeamInvite, sendWhatsApp;

  afterEach(() => {
    countDocuments?.mock.restore();
    findOne?.mock.restore();
    create?.mock.restore();
    sendTeamInvite?.mock.restore();
    sendWhatsApp?.mock.restore();
  });

  test('blocks a 6th invite on the Basic plan with 403, never touches User.findOne/create', async () => {
    countDocuments = mock.method(User, 'countDocuments', () => Promise.resolve(5));
    findOne = mock.method(User, 'findOne', () => Promise.resolve(null));
    create = mock.method(User, 'create', () => Promise.resolve({ _id: 'new-user' }));

    const req = fakeReq({
      user: { _id: 'admin1', companyId: COMPANY_A, plan: 'basic' },
      body: { name: 'New Hire', email: 'new@example.com', role: 'qs' },
    });
    const res = fakeRes();
    await inviteMember(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(findOne.mock.calls.length, 0);
    assert.equal(create.mock.calls.length, 0);
    assert.equal(countDocuments.mock.calls[0].arguments[0].companyId, COMPANY_A);
  });

  test('allows the invite when the Basic-plan company is under the cap', async () => {
    countDocuments = mock.method(User, 'countDocuments', () => Promise.resolve(4));
    findOne = mock.method(User, 'findOne', () => Promise.resolve(null));
    create = mock.method(User, 'create', () => Promise.resolve({ _id: 'new-user', name: 'New Hire' }));
    sendTeamInvite = mock.method(email, 'sendTeamInvite', () => Promise.resolve());
    sendWhatsApp = mock.method(whatsapp, 'sendWhatsApp', () => Promise.resolve());

    const req = fakeReq({
      user: { _id: 'admin1', companyId: COMPANY_A, plan: 'basic' },
      body: { name: 'New Hire', email: 'new@example.com', role: 'qs' },
    });
    const res = fakeRes();
    await inviteMember(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(create.mock.calls.length, 1);
  });

  test('never checks the cap for a non-Basic plan, even with 5+ existing members', async () => {
    countDocuments = mock.method(User, 'countDocuments', () => Promise.resolve(50));
    findOne = mock.method(User, 'findOne', () => Promise.resolve(null));
    create = mock.method(User, 'create', () => Promise.resolve({ _id: 'new-user', name: 'New Hire' }));
    sendTeamInvite = mock.method(email, 'sendTeamInvite', () => Promise.resolve());
    sendWhatsApp = mock.method(whatsapp, 'sendWhatsApp', () => Promise.resolve());

    const req = fakeReq({
      user: { _id: 'admin1', companyId: COMPANY_A, plan: 'premium' },
      body: { name: 'New Hire', email: 'new@example.com', role: 'qs' },
    });
    const res = fakeRes();
    await inviteMember(req, res);

    assert.equal(countDocuments.mock.calls.length, 0);
    assert.equal(res.statusCode, 201);
  });
});
