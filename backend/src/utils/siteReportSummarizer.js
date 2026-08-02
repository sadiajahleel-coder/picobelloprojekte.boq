// Condenses a set of site reports (typically a week's worth) into a single
// client-friendly paragraph. Two tiers, same "never hard-fail" philosophy
// as utils/whatsapp.js:
//   1. extractive fallback — always available, no API key needed
//   2. Anthropic-generated prose — used when ANTHROPIC_API_KEY is set;
//      falls back to (1) if the call errors, so a client update is never
//      blocked on an API outage or bad key.
//
// NOTE: only fields that actually persist on the SiteReport model are read
// here (title, description, workCarriedOut, materialsUsed, workersOnSite,
// problems, actionsRequired). The frontend's weekly/incident/snag/delivery
// form sections collect additional fields the current Mongoose schema
// doesn't define, so those values never reach the database — see the
// handoff note filed alongside this feature. Nothing this util can work
// around; it summarizes what's actually been saved.

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function reportFacts(report) {
  const openProblems = (report.problems || []).filter((p) => p.status === 'open');
  const openActions = (report.actionsRequired || []).filter((a) => a.status !== 'closed');
  return {
    date: fmtDate(report.reportDate),
    title: report.title,
    workCarriedOut: report.workCarriedOut || report.description || '',
    materialsUsed: report.materialsUsed || '',
    workersOnSite: report.workersOnSite,
    openProblems: openProblems.map((p) => p.description),
    openActions: openActions.map((a) => a.description),
  };
}

// Always works, no external dependency — a plain concatenation of what was
// actually recorded, grouped by date.
function buildExtractiveSummary(reports) {
  if (!reports.length) return 'No site reports were logged for this period.';

  const facts = reports.map(reportFacts);
  const workLines = facts
    .filter((f) => f.workCarriedOut)
    .map((f) => `${f.date}: ${f.workCarriedOut}`);
  const allProblems = facts.flatMap((f) => f.openProblems);
  const allActions = facts.flatMap((f) => f.openActions);

  let summary = workLines.length
    ? `Over this period, work included: ${workLines.join(' ')}`
    : `${reports.length} site report${reports.length > 1 ? 's were' : ' was'} logged for this period.`;

  if (allProblems.length) {
    summary += ` Open issues on site: ${allProblems.join('; ')}.`;
  }
  if (allActions.length) {
    summary += ` Outstanding actions: ${allActions.join('; ')}.`;
  }

  return summary.trim();
}

function buildPrompt(reports, projectName) {
  const facts = reports.map(reportFacts);
  const lines = facts.map((f) => {
    const parts = [`Date: ${f.date}`, `Title: ${f.title}`];
    if (f.workCarriedOut) parts.push(`Work: ${f.workCarriedOut}`);
    if (f.materialsUsed) parts.push(`Materials: ${f.materialsUsed}`);
    if (f.workersOnSite != null) parts.push(`Workers on site: ${f.workersOnSite}`);
    if (f.openProblems.length) parts.push(`Open problems: ${f.openProblems.join('; ')}`);
    if (f.openActions.length) parts.push(`Open actions: ${f.openActions.join('; ')}`);
    return `- ${parts.join(' | ')}`;
  });

  return (
    `You are drafting a short progress update for a construction client about their project` +
    `${projectName ? ` "${projectName}"` : ''}. Based only on the site report notes below, ` +
    `write ONE plain-language paragraph (3-5 sentences, no bullet points, no headings) a ` +
    `non-technical client can read to understand what happened this period, any issues worth ` +
    `their attention, and overall progress tone. Do not invent details not present in the notes.\n\n` +
    `Site report notes:\n${lines.join('\n')}`
  );
}

// reports: array of SiteReport docs for the period, already fetched/scoped.
// options.apiKey / options.model: from process.env, passed in rather than
// read directly so this module has no hidden global dependency.
async function summarizeReports(reports, { apiKey, model, projectName } = {}) {
  const fallback = buildExtractiveSummary(reports);

  if (!apiKey) {
    return { summary: fallback, configured: false };
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: model || DEFAULT_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: buildPrompt(reports, projectName) }],
    });
    const text = message.content?.find((b) => b.type === 'text')?.text?.trim();
    if (!text) return { summary: fallback, configured: true, aiFailed: true };
    return { summary: text, configured: true };
  } catch (err) {
    return { summary: fallback, configured: true, aiFailed: true, error: err.message };
  }
}

module.exports = { summarizeReports, buildExtractiveSummary };
