const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { summarizeReports, buildExtractiveSummary } = require('./siteReportSummarizer');

function report(overrides) {
  return {
    reportDate: new Date('2026-08-01'),
    title: 'Daily report',
    workCarriedOut: 'Poured foundation slab for Block A',
    materialsUsed: 'Cement, rebar',
    workersOnSite: 12,
    problems: [],
    actionsRequired: [],
    ...overrides,
  };
}

describe('buildExtractiveSummary', () => {
  test('handles an empty report list', () => {
    assert.match(buildExtractiveSummary([]), /No site reports/);
  });

  test('includes work carried out, open problems, and open actions', () => {
    const summary = buildExtractiveSummary([
      report({
        problems: [{ description: 'Delivery delayed', status: 'open' }, { description: 'Old issue', status: 'resolved' }],
        actionsRequired: [{ description: 'Reorder cement', status: 'open' }, { description: 'Done thing', status: 'closed' }],
      }),
    ]);
    assert.match(summary, /Poured foundation slab/);
    assert.match(summary, /Delivery delayed/);
    assert.doesNotMatch(summary, /Old issue/);
    assert.match(summary, /Reorder cement/);
    assert.doesNotMatch(summary, /Done thing/);
  });

  test('falls back to a report count when nothing describes the work', () => {
    const summary = buildExtractiveSummary([report({ workCarriedOut: '', description: '' })]);
    assert.match(summary, /1 site report was logged/);
  });
});

describe('summarizeReports', () => {
  test('returns the extractive fallback and configured:false when no API key is set', async () => {
    const result = await summarizeReports([report()], {});
    assert.equal(result.configured, false);
    assert.match(result.summary, /Poured foundation slab/);
  });

  test('falls back gracefully instead of throwing when the API call fails', async () => {
    // A 1ms client-side timeout guarantees a fast, deterministic failure
    // without depending on real network/proxy behavior in any environment.
    const result = await summarizeReports([report()], {
      apiKey: 'sk-ant-test-key',
      timeout: 1,
    });
    assert.equal(result.configured, true);
    assert.equal(result.aiFailed, true);
    assert.match(result.summary, /Poured foundation slab/);
  });

  test('reportCount-driving caller behavior: empty reports still returns a usable object', async () => {
    const result = await summarizeReports([], {});
    assert.equal(result.configured, false);
    assert.match(result.summary, /No site reports/);
  });
});
