const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const User = require('./User');

describe('User.toJSON', () => {
  test('strips password and every live-token field from the serialized output', () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-or-not-doesnt-matter-here',
      role: 'admin',
      resetPasswordToken: 'a-real-reset-token',
      resetPasswordExpires: new Date(),
      inviteToken: 'a-real-invite-token',
      inviteTokenExpires: new Date(),
    });

    const json = user.toJSON();

    assert.equal(json.password, undefined);
    assert.equal(json.resetPasswordToken, undefined);
    assert.equal(json.resetPasswordExpires, undefined);
    assert.equal(json.inviteToken, undefined);
    assert.equal(json.inviteTokenExpires, undefined);
  });

  test('keeps ordinary, non-sensitive fields intact', () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'x',
      role: 'qs',
    });

    const json = user.toJSON();

    assert.equal(json.name, 'Test User');
    assert.equal(json.email, 'test@example.com');
    assert.equal(json.role, 'qs');
  });
});
