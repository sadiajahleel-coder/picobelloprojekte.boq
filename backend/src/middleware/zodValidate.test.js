const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { zodValidate, schemas } = require('./zodValidate');

describe('zodValidate middleware', () => {
  test('valid body passes through, req.body replaced with parsed data, next() called', () => {
    const middleware = zodValidate(schemas.login);
    const req = { body: { email: 'a@b.com', password: 'x' } };
    let nextCalled = false;
    let statusCalled = null;
    const res = { status(code) { statusCalled = code; return this; }, json() { return this; } };
    middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(statusCalled, null);
    assert.equal(req.body.email, 'a@b.com');
  });

  test('invalid body responds 400 with field-level errors, next() not called', () => {
    const middleware = zodValidate(schemas.login);
    const req = { body: { email: 'not-an-email' } };
    let nextCalled = false;
    let statusCalled = null;
    let jsonBody = null;
    const res = { status(code) { statusCalled = code; return this; }, json(b) { jsonBody = b; return this; } };
    middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(statusCalled, 400);
    assert.equal(jsonBody.message, 'Validation failed');
    assert.ok(jsonBody.errors.some((e) => e.field === 'email'));
    assert.ok(jsonBody.errors.some((e) => e.field === 'password'));
  });
});

describe('registerSchema', () => {
  test('accepts a valid registration', () => {
    const result = schemas.register.safeParse({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' });
    assert.equal(result.success, true);
  });

  test('rejects a password under 6 characters', () => {
    const result = schemas.register.safeParse({ name: 'Jane Doe', email: 'jane@example.com', password: '123' });
    assert.equal(result.success, false);
  });

  test('rejects an invalid email', () => {
    const result = schemas.register.safeParse({ name: 'Jane Doe', email: 'not-an-email', password: 'password123' });
    assert.equal(result.success, false);
  });

  test('rejects a one-character name', () => {
    const result = schemas.register.safeParse({ name: 'J', email: 'jane@example.com', password: 'password123' });
    assert.equal(result.success, false);
  });

  test('companyName is optional', () => {
    const result = schemas.register.safeParse({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' });
    assert.equal(result.success, true);
  });
});

describe('invoiceSchema (money-path validation)', () => {
  test('accepts the real create-from-estimate payload (estimateId only) -- this used to 400 on every request', () => {
    const result = schemas.invoice.safeParse({ estimateId: 'est1' });
    assert.equal(result.success, true);
  });

  test('accepts the real standalone-creation payload sent by Invoices.jsx', () => {
    const result = schemas.invoice.safeParse({
      projectId: '', projectName: 'Garuba Duplex Renovation', clientName: 'Mr Garuba',
      dueDate: '2026-09-01', currency: 'NGN',
    });
    assert.equal(result.success, true);
  });

  test('accepts a negative unit rate as invalid', () => {
    const result = schemas.invoice.safeParse({
      lineItems: [{ description: 'Cement', quantity: 10, unitRate: -1 }],
    });
    assert.equal(result.success, false);
  });

  test('strips an attacker-supplied companyId on the update path (mass-assignment fix)', () => {
    const result = schemas.invoice.safeParse({ projectName: 'X', companyId: 'someone-elses-company' });
    assert.equal(result.success, true);
    assert.equal(result.data.companyId, undefined);
  });
});

describe('estimateSchema / estimateUpdateSchema (money-path validation)', () => {
  test('accepts the real payload sent by Estimator.jsx on create', () => {
    const result = schemas.estimate.safeParse({
      projectName: 'Garuba Duplex Renovation', clientName: '', clientPhone: '', clientEmail: '',
      location: '', sizeM2: '250', condition: 'carcass', tier: 'basic',
      includesFurniture: false, includesKitchen: false, includesWardrobes: false,
      scopeAssumptions: '', exclusions: '', validityDays: 30,
    });
    assert.equal(result.success, true);
    assert.equal(result.data.sizeM2, 250);
  });

  test('rejects a create payload missing condition/tier', () => {
    const result = schemas.estimate.safeParse({ projectName: 'X', sizeM2: 100 });
    assert.equal(result.success, false);
  });

  test('estimateUpdate accepts a partial payload (the real shape EstimateDetail.jsx sends) and strips an injected companyId', () => {
    const result = schemas.estimateUpdate.safeParse({
      projectName: 'X', status: 'sent', taxPercent: 7.5, overheadPercent: 0, profitPercent: 0,
      companyId: 'someone-elses-company',
    });
    assert.equal(result.success, true);
    assert.equal(result.data.companyId, undefined);
  });
});

describe('boqItemSchema (money-path validation)', () => {
  test('accepts a valid BOQ item and coerces numeric strings', () => {
    const result = schemas.boqItem.safeParse({
      item: 'Cement 50kg bag', unit: 'bag', quantity: '10', baseCost: '5000',
    });
    assert.equal(result.success, true);
    assert.equal(result.data.quantity, 10);
    assert.equal(result.data.baseCost, 5000);
  });

  test('rejects a negative baseCost', () => {
    const result = schemas.boqItem.safeParse({ item: 'Cement', unit: 'bag', quantity: 10, baseCost: -1 });
    assert.equal(result.success, false);
  });

  test('rejects a missing item name', () => {
    const result = schemas.boqItem.safeParse({ unit: 'bag', quantity: 10, baseCost: 100 });
    assert.equal(result.success, false);
  });

  test('boqItemUpdate: all fields optional, still rejects a negative baseCost when provided', () => {
    assert.equal(schemas.boqItemUpdate.safeParse({}).success, true);
    assert.equal(schemas.boqItemUpdate.safeParse({ baseCost: -5 }).success, false);
  });

  test('strips unknown fields (e.g. versionId) by default -- closes the same mass-assignment class as the IDOR fix', () => {
    const result = schemas.boqItemUpdate.safeParse({ baseCost: 100, versionId: 'someone-elses-version' });
    assert.equal(result.success, true);
    assert.equal(result.data.versionId, undefined);
  });
});

describe('boqVersionSchema', () => {
  test('rejects a missing name', () => {
    assert.equal(schemas.boqVersion.safeParse({}).success, false);
  });

  test('rejects an invalid status', () => {
    assert.equal(schemas.boqVersion.safeParse({ name: 'V1', status: 'bogus' }).success, false);
  });

  test('strips unknown fields such as companyId or totalCost', () => {
    const result = schemas.boqVersion.safeParse({ name: 'V1', companyId: 'other-company', totalCost: 999999 });
    assert.equal(result.success, true);
    assert.equal(result.data.companyId, undefined);
    assert.equal(result.data.totalCost, undefined);
  });
});

describe('changeOrderSchema (money-path validation)', () => {
  test('accepts a valid change order and coerces numeric strings', () => {
    const result = schemas.changeOrder.safeParse({
      projectId: 'p1', title: 'Extra foundation work', originalCost: '10000', newCost: '15000',
    });
    assert.equal(result.success, true);
    assert.equal(result.data.originalCost, 10000);
  });

  test('rejects a negative newCost', () => {
    const result = schemas.changeOrder.safeParse({
      projectId: 'p1', title: 'X', originalCost: 1000, newCost: -1,
    });
    assert.equal(result.success, false);
  });

  test('rejects a missing projectId', () => {
    const result = schemas.changeOrder.safeParse({ title: 'X', originalCost: 1000, newCost: 1200 });
    assert.equal(result.success, false);
  });
});

describe('expenseSchema (money-path validation)', () => {
  test('accepts a valid expense, coercing amount from a multipart string', () => {
    const result = schemas.expense.safeParse({ description: 'Cement delivery', amount: '25000' });
    assert.equal(result.success, true);
    assert.equal(result.data.amount, 25000);
  });

  test('rejects a negative amount', () => {
    const result = schemas.expense.safeParse({ description: 'X', amount: -1 });
    assert.equal(result.success, false);
  });

  test('rejects an invalid category', () => {
    const result = schemas.expense.safeParse({ description: 'X', amount: 100, category: 'Not A Real Category' });
    assert.equal(result.success, false);
  });
});

describe('estimateCalculateSchema', () => {
  test('rejects a non-positive sizeM2', () => {
    assert.equal(schemas.estimateCalculate.safeParse({ sizeM2: 0, condition: 'carcass', tier: 'basic' }).success, false);
  });

  test('rejects an unrecognized condition', () => {
    assert.equal(schemas.estimateCalculate.safeParse({ sizeM2: 150, condition: 'luxury', tier: 'basic' }).success, false);
  });

  test('accepts a valid payload and coerces sizeM2 from a string', () => {
    const result = schemas.estimateCalculate.safeParse({ sizeM2: '150', condition: 'carcass', tier: 'basic' });
    assert.equal(result.success, true);
    assert.equal(result.data.sizeM2, 150);
  });
});

describe('weeklyReportSchema', () => {
  test('coerces weekNumber from a string -- fixes a latent comparison bug against the stored Number field', () => {
    const result = schemas.weeklyReport.safeParse({ weekNumber: '3' });
    assert.equal(result.success, true);
    assert.equal(result.data.weekNumber, 3);
    assert.equal(typeof result.data.weekNumber, 'number');
  });

  test('rejects a missing weekNumber', () => {
    assert.equal(schemas.weeklyReport.safeParse({}).success, false);
  });
});
