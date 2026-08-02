const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { recalcTotals } = require('./invoiceCalculations');

function invoice(overrides) {
  return {
    lineItems: [], vatRate: 0, payments: [], status: 'draft',
    ...overrides,
  };
}

describe('recalcTotals', () => {
  test('subtotal is the sum of line item amounts', () => {
    const inv = invoice({ lineItems: [{ amount: 100 }, { amount: 250 }] });
    recalcTotals(inv);
    assert.equal(inv.subtotal, 350);
    assert.equal(inv.total, 350);
  });

  test('VAT is applied as a percentage of subtotal, added to total', () => {
    const inv = invoice({ lineItems: [{ amount: 1000 }], vatRate: 7.5 });
    recalcTotals(inv);
    assert.equal(inv.vatAmount, 75);
    assert.equal(inv.total, 1075);
  });

  test('amountPaid sums all payments, balance is total minus paid', () => {
    const inv = invoice({
      lineItems: [{ amount: 1000 }],
      payments: [{ amount: 300 }, { amount: 200 }],
    });
    recalcTotals(inv);
    assert.equal(inv.amountPaid, 500);
    assert.equal(inv.balance, 500);
    assert.equal(inv.status, 'draft'); // still owing, status untouched
  });

  test('balance fully covered by payments auto-marks the invoice paid', () => {
    const inv = invoice({
      lineItems: [{ amount: 1000 }],
      payments: [{ amount: 1000 }],
      status: 'sent',
    });
    recalcTotals(inv);
    assert.equal(inv.balance, 0);
    assert.equal(inv.status, 'paid');
  });

  test('overpayment still marks paid, balance goes negative rather than clamping', () => {
    const inv = invoice({
      lineItems: [{ amount: 1000 }],
      payments: [{ amount: 1200 }],
      status: 'sent',
    });
    recalcTotals(inv);
    assert.equal(inv.balance, -200);
    assert.equal(inv.status, 'paid');
  });

  test('a zero-total invoice (no line items) is not auto-marked paid', () => {
    const inv = invoice({ lineItems: [], status: 'draft' });
    recalcTotals(inv);
    assert.equal(inv.total, 0);
    assert.equal(inv.status, 'draft'); // total > 0 guard prevents a false "paid" on an empty invoice
  });

  test('missing lineItems/payments arrays default gracefully, not throw', () => {
    const inv = { vatRate: 0 };
    assert.doesNotThrow(() => recalcTotals(inv));
    assert.equal(inv.total, 0);
  });
});
