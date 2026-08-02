const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { draftBoqItems, parseItems } = require('./aiBoqDrafter');

describe('parseItems', () => {
  test('parses a clean JSON array', () => {
    const items = parseItems('[{"item":"Excavation","unit":"m3","quantity":10,"baseCost":500}]');
    assert.equal(items.length, 1);
    assert.equal(items[0].item, 'Excavation');
  });

  test('strips markdown fences', () => {
    const items = parseItems('```json\n[{"item":"Excavation","unit":"m3"}]\n```');
    assert.equal(items.length, 1);
  });

  test('extracts the array when the model adds a preamble/postamble despite instructions', () => {
    const items = parseItems('Here is the draft BOQ:\n[{"item":"Excavation","unit":"m3"}]\nLet me know if you need changes.');
    assert.equal(items.length, 1);
    assert.equal(items[0].item, 'Excavation');
  });

  test('drops rows missing a required field and keeps the rest', () => {
    const items = parseItems('[{"item":"Excavation","unit":"m3"},{"description":"no item or unit"}]');
    assert.equal(items.length, 1);
  });

  test('defaults quantity to 1 and baseCost to 0 when missing or invalid', () => {
    const items = parseItems('[{"item":"Excavation","unit":"m3","quantity":"not a number","baseCost":-5}]');
    assert.equal(items[0].quantity, 1);
    assert.equal(items[0].baseCost, 0);
  });

  test('throws on genuinely unparseable text', () => {
    assert.throws(() => parseItems('Sorry, I cannot help with that.'));
  });
});

describe('draftBoqItems', () => {
  test('requires a description', async () => {
    const result = await draftBoqItems('', { apiKey: 'sk-ant-test' });
    assert.equal(result.items.length, 0);
    assert.match(result.error, /description is required/);
  });

  test('returns not-configured with no items when no API key is set', async () => {
    const result = await draftBoqItems('Two-bedroom bungalow', {});
    assert.equal(result.configured, false);
    assert.deepEqual(result.items, []);
    assert.match(result.error, /not configured/);
  });

  test('falls back to a clear error instead of throwing when the API call fails', async () => {
    const result = await draftBoqItems('Two-bedroom bungalow, 120sqm', {
      apiKey: 'sk-ant-test-key',
      timeout: 1,
    });
    assert.equal(result.configured, true);
    assert.deepEqual(result.items, []);
    assert.match(result.error, /AI BOQ drafting failed/);
  });
});
