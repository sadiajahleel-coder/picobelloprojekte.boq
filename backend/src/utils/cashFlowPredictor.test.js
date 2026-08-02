const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeClientRisk } = require('./cashFlowPredictor');

const NOW = new Date('2026-08-02T00:00:00Z').getTime();
const DAY = 86400000;

function invoice(overrides) {
  return {
    clientName: 'Acme Ltd',
    clientEmail: 'acme@example.com',
    total: 100000,
    balance: 0,
    amountPaid: 100000,
    status: 'paid',
    dueDate: new Date(NOW - 30 * DAY),
    payments: [],
    ...overrides,
  };
}

describe('computeClientRisk', () => {
  test('a client who always pays on time is low risk', () => {
    const invoices = [
      invoice({ payments: [{ paymentDate: new Date(NOW - 31 * DAY) }] }),
      invoice({ payments: [{ paymentDate: new Date(NOW - 42 * DAY) }], dueDate: new Date(NOW - 40 * DAY) }),
    ];
    const [client] = computeClientRisk(invoices, NOW);
    assert.equal(client.tier, 'low');
    assert.equal(client.onTimeRate, 1);
  });

  test('an invoice 60+ days overdue is high risk', () => {
    const invoices = [
      invoice({ status: 'overdue', balance: 50000, amountPaid: 0, dueDate: new Date(NOW - 65 * DAY) }),
    ];
    const [client] = computeClientRisk(invoices, NOW);
    assert.equal(client.tier, 'high');
    assert.ok(client.maxDaysLate >= 60);
    assert.ok(client.reasons.some((r) => r.includes('65 days')));
  });

  test('a single moderately late invoice is medium risk, not high', () => {
    const invoices = [
      invoice({ payments: [{ paymentDate: new Date(NOW - 5 * DAY) }], dueDate: new Date(NOW - 25 * DAY) }),
    ];
    const [client] = computeClientRisk(invoices, NOW);
    assert.equal(client.tier, 'medium');
  });

  test('a paid invoice settled before the due date is never counted as late', () => {
    const invoices = [
      invoice({ dueDate: new Date(NOW - 10 * DAY), payments: [{ paymentDate: new Date(NOW - 15 * DAY) }] }),
    ];
    const [client] = computeClientRisk(invoices, NOW);
    assert.equal(client.lateInvoiceCount, 0);
    assert.equal(client.tier, 'low');
  });

  test('groups invoices by client and sorts high risk first', () => {
    const invoices = [
      invoice({ clientEmail: 'good@example.com', clientName: 'Good Client' }),
      invoice({ clientEmail: 'bad@example.com', clientName: 'Bad Client', status: 'overdue', balance: 200000, amountPaid: 0, dueDate: new Date(NOW - 90 * DAY) }),
    ];
    const clients = computeClientRisk(invoices, NOW);
    assert.equal(clients.length, 2);
    assert.equal(clients[0].clientName, 'Bad Client');
    assert.equal(clients[0].tier, 'high');
    assert.equal(clients[1].clientName, 'Good Client');
  });

  test('an invoice with no dueDate never counts as late', () => {
    const invoices = [invoice({ status: 'sent', balance: 50000, amountPaid: 0, dueDate: null })];
    const [client] = computeClientRisk(invoices, NOW);
    assert.equal(client.tier, 'low');
  });

  test('empty invoice list produces no clients', () => {
    assert.deepEqual(computeClientRisk([], NOW), []);
  });
});
