const { test, describe, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Approval = require('../models/Approval');
const BoqItem = require('../models/BoqItem');
const BoqVersion = require('../models/BoqVersion');
const Notification = require('../models/Notification');
const {
  getApprovals, submitItemDecision, submitVersionDecision,
} = require('./approvalController');

const COMPANY_A = 'company-a';
const COMPANY_B = 'company-b';

function fakeReq(overrides = {}) {
  return { query: {}, params: {}, body: {}, ...overrides };
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

function chainable(result) {
  const thenable = Promise.resolve(result);
  thenable.populate = () => thenable;
  thenable.sort = () => thenable;
  thenable.select = () => thenable;
  return thenable;
}

describe('approvalController — cross-tenant isolation', () => {
  let find, findOne, findOneAndUpdate, itemFindOne, versionFindOne, notifyCreate;

  afterEach(() => {
    find?.mock.restore();
    findOne?.mock.restore();
    findOneAndUpdate?.mock.restore();
    itemFindOne?.mock.restore();
    versionFindOne?.mock.restore();
    notifyCreate?.mock.restore();
  });

  test('getApprovals: an admin in Company A never receives Company B records — filter is always scoped by the caller\'s own companyId', async () => {
    find = mock.method(Approval, 'find', () => chainable([]));

    const req = fakeReq({ user: { _id: 'u1', role: 'admin', companyId: COMPANY_A } });
    await getApprovals(req, fakeRes());

    assert.equal(find.mock.calls.length, 1);
    const filterUsed = find.mock.calls[0].arguments[0];
    assert.equal(filterUsed.companyId, COMPANY_A);
    assert.notEqual(filterUsed.companyId, COMPANY_B);
  });

  test('getApprovals: passing another company\'s boqVersionId as a query param cannot bypass the companyId scope', async () => {
    find = mock.method(Approval, 'find', () => chainable([]));

    const req = fakeReq({
      user: { _id: 'u1', role: 'admin', companyId: COMPANY_A },
      query: { boqVersionId: 'someone-elses-version' },
    });
    await getApprovals(req, fakeRes());

    const filterUsed = find.mock.calls[0].arguments[0];
    // companyId stays pinned to the caller's own company regardless of what
    // boqVersionId was requested — Mongo will AND the two together, so a
    // cross-tenant id simply yields zero rows rather than leaking data.
    assert.equal(filterUsed.companyId, COMPANY_A);
    assert.equal(filterUsed.boqVersionId, 'someone-elses-version');
  });

  test('submitItemDecision: rejects a BOQ version that belongs to a different company (404, no approval written)', async () => {
    versionFindOne = mock.method(BoqVersion, 'findOne', () => Promise.resolve(null));
    findOneAndUpdate = mock.method(Approval, 'findOneAndUpdate', () => Promise.resolve({}));

    const req = fakeReq({
      user: { _id: 'client1', role: 'client', companyId: COMPANY_A },
      body: { boqVersionId: 'v-in-company-b', boqItemId: 'item1', status: 'approved' },
    });
    const res = fakeRes();
    await submitItemDecision(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(findOneAndUpdate.mock.calls.length, 0);
    // proves the lookup was itself scoped by the caller's company
    assert.equal(versionFindOne.mock.calls[0].arguments[0].companyId, COMPANY_A);
  });

  test('submitItemDecision: rejects a BOQ item that does not belong to the (already-verified) version', async () => {
    versionFindOne = mock.method(BoqVersion, 'findOne', () => Promise.resolve({ _id: 'v1', companyId: COMPANY_A }));
    itemFindOne = mock.method(BoqItem, 'findOne', () => Promise.resolve(null));
    findOneAndUpdate = mock.method(Approval, 'findOneAndUpdate', () => Promise.resolve({}));

    const req = fakeReq({
      user: { _id: 'client1', role: 'client', companyId: COMPANY_A },
      body: { boqVersionId: 'v1', boqItemId: 'item-from-elsewhere', status: 'approved' },
    });
    const res = fakeRes();
    await submitItemDecision(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(findOneAndUpdate.mock.calls.length, 0);
  });

  test('submitItemDecision: stamps companyId onto the approval it writes', async () => {
    versionFindOne = mock.method(BoqVersion, 'findOne', () => Promise.resolve({ _id: 'v1', companyId: COMPANY_A }));
    itemFindOne = mock.method(BoqItem, 'findOne', () => Promise.resolve({ _id: 'item1', options: [] }));
    findOneAndUpdate = mock.method(Approval, 'findOneAndUpdate', () => Promise.resolve({ _id: 'a1' }));

    const req = fakeReq({
      user: { _id: 'client1', role: 'client', companyId: COMPANY_A },
      body: { boqVersionId: 'v1', boqItemId: 'item1', status: 'approved' },
    });
    await submitItemDecision(req, fakeRes());

    const updateDoc = findOneAndUpdate.mock.calls[0].arguments[1];
    assert.equal(updateDoc.companyId, COMPANY_A);
  });

  test('submitVersionDecision: rejects a BOQ version from a different company (404, no notification sent)', async () => {
    versionFindOne = mock.method(BoqVersion, 'findOne', () => Promise.resolve(null));
    findOneAndUpdate = mock.method(Approval, 'findOneAndUpdate', () => Promise.resolve({}));
    notifyCreate = mock.method(Notification, 'create', () => Promise.resolve({}));

    const req = fakeReq({
      user: { _id: 'client1', role: 'client', companyId: COMPANY_A },
      params: { boqVersionId: 'v-in-company-b' },
      body: { status: 'approved' },
    });
    const res = fakeRes();
    await submitVersionDecision(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(findOneAndUpdate.mock.calls.length, 0);
    assert.equal(notifyCreate.mock.calls.length, 0);
  });
});
