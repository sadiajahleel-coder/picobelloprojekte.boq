const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { escapeRegex } = require('./escapeRegex');

describe('escapeRegex', () => {
  test('escapes every regex metacharacter', () => {
    const input = '.*+?^${}()|[]\\';
    const escaped = escapeRegex(input);
    // The escaped string, compiled as a regex, must match only the exact literal input.
    const re = new RegExp(escaped);
    assert.ok(re.test(input));
    assert.equal(re.source.includes('\\.'), true);
  });

  test('a malicious pattern no longer throws when compiled', () => {
    assert.doesNotThrow(() => new RegExp(escapeRegex('('), 'i'));
    assert.doesNotThrow(() => new RegExp(escapeRegex('(a+)+$'), 'i'));
  });

  test('leaves plain alphanumeric search terms unchanged', () => {
    assert.equal(escapeRegex('Cement'), 'Cement');
    assert.equal(escapeRegex('Lagos Supplies 2024'), 'Lagos Supplies 2024');
  });

  test('a crafted quantifier pattern matches only as a literal string, not as regex syntax', () => {
    const escaped = escapeRegex('(a+)+');
    const re = new RegExp(escaped, 'i');
    assert.equal(re.test('(a+)+'), true);
    assert.equal(re.test('aaaaaaaaaa'), false);
  });
});
