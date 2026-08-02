const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateBoqItem } = require('./boqCalculations');

describe('calculateBoqItem', () => {
  test('applies overhead and profit multiplicatively, then multiplies by quantity', () => {
    const { finalUnitPrice, totalCost } = calculateBoqItem({
      baseCost: 1000, overheadPercent: 10, profitPercent: 20, quantity: 5,
    });
    // 1000 * 1.10 * 1.20 = 1320
    assert.equal(finalUnitPrice, 1320);
    assert.equal(totalCost, 6600);
  });

  test('zero overhead and profit: unit price equals base cost', () => {
    const { finalUnitPrice, totalCost } = calculateBoqItem({
      baseCost: 500, overheadPercent: 0, profitPercent: 0, quantity: 3,
    });
    assert.equal(finalUnitPrice, 500);
    assert.equal(totalCost, 1500);
  });

  test('rounds to 2 decimal places', () => {
    const { finalUnitPrice } = calculateBoqItem({
      baseCost: 33.333, overheadPercent: 7.5, profitPercent: 3.25, quantity: 1,
    });
    assert.equal(finalUnitPrice, Math.round(finalUnitPrice * 100) / 100);
  });

  test('zero quantity produces zero total cost, not NaN', () => {
    const { totalCost } = calculateBoqItem({ baseCost: 1000, overheadPercent: 10, profitPercent: 10, quantity: 0 });
    assert.equal(totalCost, 0);
  });

  test('missing overhead/profit/quantity default to zero rather than throwing', () => {
    const result = calculateBoqItem({ baseCost: 100 });
    assert.equal(result.finalUnitPrice, 100);
    assert.equal(result.totalCost, 0);
  });
});
