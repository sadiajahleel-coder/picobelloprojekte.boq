const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// process.env.CLIENT_URL must be set before requiring the module, since
// allowedOrigins is computed once at load time.
process.env.CLIENT_URL = 'https://squaremetre.onrender.com';
const { checkOrigin } = require('./corsOptions');

function check(origin) {
  let result;
  checkOrigin(origin, (err, ok) => { result = err ? { error: err.message } : { ok }; });
  return result;
}

describe('checkOrigin', () => {
  test('allows requests with no Origin header (e.g. server-to-server, curl)', () => {
    assert.deepEqual(check(undefined), { ok: true });
  });

  test('allows the configured CLIENT_URL exactly', () => {
    assert.deepEqual(check('https://squaremetre.onrender.com'), { ok: true });
  });

  test('allows the local dev origins', () => {
    assert.deepEqual(check('http://localhost:5173'), { ok: true });
    assert.deepEqual(check('http://localhost:3000'), { ok: true });
  });

  test('rejects a suffix-appended lookalike origin (the old startsWith bypass)', () => {
    const result = check('https://squaremetre.onrender.com.attacker.com');
    assert.ok(result.error);
  });

  test('rejects an arbitrary other app on the shared *.onrender.com host (the old wildcard bypass)', () => {
    const result = check('https://some-other-app.onrender.com');
    assert.ok(result.error);
  });

  test('rejects an unrelated origin entirely', () => {
    const result = check('https://evil.com');
    assert.ok(result.error);
  });
});
