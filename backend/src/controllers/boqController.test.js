const { test, describe, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const BoqItem = require('../models/BoqItem');
const BoqVersion = require('../models/BoqVersion');
const { updateItem, deleteItem } = require('./boqController');

const COMPANY_A = 'company-a';

function fakeReq(overrides = {}) {
  return { params: {}, body: {}, ...overrides };
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

describe('boqController — BOQ item IDOR', () => {
  let versionFindOne, itemFindOne, itemFindOneAndDelete, itemFind, versionFindByIdAndUpdate;

  afterEach(() => {
    versionFindOne?.mock.restore();
    itemFindOne?.mock.restore();
    itemFindOneAndDelete?.mock.restore();
    itemFind?.mock.restore();
    versionFindByIdAndUpdate?.mock.restore();
  });

  test('updateItem: 404s (and never touches the item) when the version in the URL belongs to a different company', async () => {
    versionFindOne = mock.method(BoqVersion, 'findOne', () => Promise.resolve(null));
    itemFindOne = mock.method(BoqItem, 'findOne', () => Promise.resolve({ save: mock.fn() }));

    const req = fakeReq({
      user: { companyId: COMPANY_A },
      params: { id: 'v-in-company-b', itemId: 'item1' },
      body: { baseCost: 999999 },
    });
    const res = fakeRes();
    await updateItem(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(itemFindOne.mock.calls.length, 0);
    // proves the version lookup was itself scoped by the caller's company
    assert.equal(versionFindOne.mock.calls[0].arguments[0].companyId, COMPANY_A);
  });

  test('updateItem: 404s when the itemId does not belong to the version named in the URL, even if the version is the caller\'s own', async () => {
    versionFindOne = mock.method(BoqVersion, 'findOne', () => Promise.resolve({ _id: 'v1', companyId: COMPANY_A }));
    itemFindOne = mock.method(BoqItem, 'findOne', () => Promise.resolve(null));

    const req = fakeReq({
      user: { companyId: COMPANY_A },
      params: { id: 'v1', itemId: 'item-from-another-version' },
      body: { baseCost: 500 },
    });
    const res = fakeRes();
    await updateItem(req, res);

    assert.equal(res.statusCode, 404);
    const itemFilter = itemFindOne.mock.calls[0].arguments[0];
    assert.equal(itemFilter.versionId, 'v1');
  });

  test('updateItem: strips versionId from the request body so an item cannot be relocated into another company\'s version', async () => {
    versionFindOne = mock.method(BoqVersion, 'findOne', () => Promise.resolve({ _id: 'v1', companyId: COMPANY_A }));
    const save = mock.fn(() => Promise.resolve());
    const item = { _id: 'item1', versionId: 'v1', baseCost: 100, save };
    itemFindOne = mock.method(BoqItem, 'findOne', () => Promise.resolve(item));
    itemFind = mock.method(BoqItem, 'find', () => Promise.resolve([]));
    versionFindByIdAndUpdate = mock.method(BoqVersion, 'findByIdAndUpdate', () => Promise.resolve({}));

    const req = fakeReq({
      user: { companyId: COMPANY_A },
      params: { id: 'v1', itemId: 'item1' },
      body: { baseCost: 250, versionId: 'v-in-company-b' },
    });
    await updateItem(req, fakeRes());

    assert.equal(item.baseCost, 250);
    assert.equal(item.versionId, 'v1');
  });

  test('deleteItem: 404s (and never deletes) when the version in the URL belongs to a different company', async () => {
    versionFindOne = mock.method(BoqVersion, 'findOne', () => Promise.resolve(null));
    itemFindOneAndDelete = mock.method(BoqItem, 'findOneAndDelete', () => Promise.resolve({ versionId: 'v1' }));

    const req = fakeReq({
      user: { companyId: COMPANY_A },
      params: { id: 'v-in-company-b', itemId: 'item1' },
    });
    const res = fakeRes();
    await deleteItem(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(itemFindOneAndDelete.mock.calls.length, 0);
  });
});
