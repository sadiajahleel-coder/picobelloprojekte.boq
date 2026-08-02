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
  test('accepts a valid invoice with positive quantities and non-negative rates', () => {
    const result = schemas.invoice.safeParse({
      title: 'Invoice #1',
      lineItems: [{ description: 'Cement', quantity: 10, unitRate: 5000 }],
    });
    assert.equal(result.success, true);
  });

  test('rejects a zero or negative line-item quantity', () => {
    const result = schemas.invoice.safeParse({
      title: 'Invoice #1',
      lineItems: [{ description: 'Cement', quantity: 0, unitRate: 5000 }],
    });
    assert.equal(result.success, false);
  });

  test('rejects a negative unit rate', () => {
    const result = schemas.invoice.safeParse({
      title: 'Invoice #1',
      lineItems: [{ description: 'Cement', quantity: 10, unitRate: -1 }],
    });
    assert.equal(result.success, false);
  });

  test('rejects a missing title', () => {
    const result = schemas.invoice.safeParse({ lineItems: [] });
    assert.equal(result.success, false);
  });
});
