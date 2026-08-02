// Turns a free-text project description into a draft list of BOQ line
// items via Anthropic Claude. Unlike siteReportSummarizer.js, there is no
// meaningful non-AI fallback here — generating line items from prose is
// fundamentally a generative task — so with no API key configured this
// returns a clear "not configured" result rather than pretending to work.
//
// Nothing gets persisted here. Same "compute on read" approach as
// rateAlerter.js/boqReviewer.js/cashFlowPredictor.js: this returns a
// draft for a human to review; it's the existing BOQ version/item
// endpoints (boqController.createVersion/addItem) that actually save
// anything, once the user accepts some or all of the draft.

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_LIBRARY_ITEMS_IN_PROMPT = 200;

function buildPrompt(description, { projectName, currency, qsPrices }) {
  const library = (qsPrices || []).slice(0, MAX_LIBRARY_ITEMS_IN_PROMPT)
    .map((p) => `- ${p.item} | ${p.unit} | ${p.price}`)
    .join('\n');

  return (
    `You are a quantity surveyor drafting a Bill of Quantities (BOQ) for a construction project` +
    `${projectName ? ` called "${projectName}"` : ''}, priced in ${currency || 'NGN'}.\n\n` +
    `Project description:\n${description}\n\n` +
    (library
      ? `The company's known rate library (item | unit | rate) — prefer these exact rates when an ` +
        `item genuinely matches one below, since they reflect this company's real costs:\n${library}\n\n`
      : '') +
    `Produce a draft list of BOQ line items covering the trades implied by the description. For each ` +
    `item, decide "source": "library" if you used a rate from the list above for a matching item, or ` +
    `"estimated" if you're supplying a reasonable market-rate estimate because nothing in the library ` +
    `matched. Respond with ONLY a JSON array (no prose, no markdown fences), each element shaped exactly ` +
    `like:\n` +
    `{"item": "string", "description": "string", "unit": "string", "quantity": number, "baseCost": number, "source": "library" | "estimated"}\n\n` +
    `Quantities and rates should be realistic for the scope described. If the description is too vague ` +
    `to estimate quantities, make reasonable assumptions rather than returning an empty list.`
  );
}

function parseItems(text) {
  // Model was asked for raw JSON, but strip markdown fences defensively
  // in case it wraps the response anyway.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Response was not a JSON array');

  return parsed
    .filter((row) => row && typeof row.item === 'string' && row.item.trim() && typeof row.unit === 'string' && row.unit.trim())
    .map((row) => ({
      item: row.item.trim(),
      description: typeof row.description === 'string' ? row.description.trim() : '',
      unit: row.unit.trim(),
      quantity: Number.isFinite(Number(row.quantity)) && Number(row.quantity) > 0 ? Number(row.quantity) : 1,
      baseCost: Number.isFinite(Number(row.baseCost)) && Number(row.baseCost) >= 0 ? Number(row.baseCost) : 0,
      source: row.source === 'library' ? 'library' : 'estimated',
    }));
}

// qsPrices: this company's QsPrice docs (item/unit/price), for grounding.
async function draftBoqItems(description, { apiKey, model, baseURL, timeout, projectName, currency, qsPrices } = {}) {
  if (!description || !description.trim()) {
    return { configured: Boolean(apiKey), items: [], error: 'A project description is required.' };
  }

  if (!apiKey) {
    return {
      configured: false,
      items: [],
      error: 'AI BOQ drafting is not configured for this account. Set ANTHROPIC_API_KEY to enable it.',
    };
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey,
      maxRetries: 0,
      ...(baseURL ? { baseURL } : {}),
      ...(timeout ? { timeout } : {}),
    });
    const message = await client.messages.create({
      model: model || DEFAULT_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildPrompt(description, { projectName, currency, qsPrices }) }],
    });
    const text = message.content?.find((b) => b.type === 'text')?.text;
    if (!text) return { configured: true, items: [], error: 'The AI returned an empty response.' };

    const items = parseItems(text);
    if (!items.length) return { configured: true, items: [], error: 'The AI response could not be read as BOQ line items. Try rephrasing the description.' };

    return { configured: true, items };
  } catch (err) {
    return { configured: true, items: [], error: `AI BOQ drafting failed: ${err.message}` };
  }
}

module.exports = { draftBoqItems };
