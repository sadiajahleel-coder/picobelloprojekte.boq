const { test, describe, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const QsPrice = require('../models/QsPrice');
const { getAll } = require('./qsPriceController');
const { LIST_SAFETY_CAP } = require('../config/limits');

function fakeRes() {
  const res = { body: null, status() { return res; }, json(payload) { res.body = payload; return res; } };
  return res;
}

describe('qsPriceController.getAll — row safety cap', () => {
  let find;
  afterEach(() => { find?.mock.restore(); });

  test('applies the shared LIST_SAFETY_CAP to the query', async () => {
    let capturedLimit;
    find = mock.method(QsPrice, 'find', () => ({
      populate: () => ({
        sort: () => ({
          limit: (n) => { capturedLimit = n; return Promise.resolve([]); },
        }),
      }),
    }));

    const req = { query: {}, user: { companyId: 'company-a' } };
    await getAll(req, fakeRes());

    assert.equal(capturedLimit, LIST_SAFETY_CAP);
  });
});
