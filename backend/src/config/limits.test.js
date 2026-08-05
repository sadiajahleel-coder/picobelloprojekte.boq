const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { LIST_SAFETY_CAP, BASIC_TEAM_MEMBER_LIMIT } = require('./limits');

describe('limits config', () => {
  test('LIST_SAFETY_CAP is a sane positive ceiling', () => {
    assert.equal(typeof LIST_SAFETY_CAP, 'number');
    assert.ok(LIST_SAFETY_CAP > 0);
  });

  test('BASIC_TEAM_MEMBER_LIMIT matches the "Up to 5 team members" claim on the landing page', () => {
    assert.equal(BASIC_TEAM_MEMBER_LIMIT, 5);
  });
});
