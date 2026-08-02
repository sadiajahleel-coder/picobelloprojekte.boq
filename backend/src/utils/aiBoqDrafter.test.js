const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { draftBoqItems } = require('./aiBoqDrafter');

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
