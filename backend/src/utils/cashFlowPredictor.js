// Rule-based cash-flow risk scoring, computed live from invoice payment
// history — same "compute on read, persist nothing" approach as
// rateAlerter.js / boqReviewer.js. No external API involved.
//
// A client's risk is driven by how late they've actually paid, not just
// whether they currently owe money — a client with a large but current
// balance is not "high risk" the way a client with a habit of 60+ day-late
// payments is.

const DAY_MS = 86400000;

const HIGH_MAX_DAYS_LATE = 60;
const MEDIUM_MAX_DAYS_LATE = 21;
const HIGH_LATE_INVOICE_COUNT = 3;
const MEDIUM_LATE_INVOICE_COUNT = 1;
const HIGH_ON_TIME_RATE = 0.5;

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Days between an invoice's due date and when it was actually settled
// (last payment) or, if still open, days overdue as of now. 0 if never late.
function daysLate(invoice, now) {
  if (!invoice.dueDate) return 0;
  const due = new Date(invoice.dueDate).getTime();

  if (invoice.status === 'paid') {
    const lastPayment = (invoice.payments || [])
      .map((p) => new Date(p.paymentDate).getTime())
      .sort((a, b) => b - a)[0];
    if (!lastPayment || lastPayment <= due) return 0;
    return Math.floor((lastPayment - due) / DAY_MS);
  }

  if (due >= now) return 0;
  return Math.floor((now - due) / DAY_MS);
}

function clientKey(invoice) {
  return (invoice.clientEmail || invoice.clientName || 'Unknown client').trim().toLowerCase();
}

function scoreClient(invoices, now) {
  const stats = invoices.reduce(
    (acc, inv) => {
      const late = daysLate(inv, now);
      acc.totalInvoiced += inv.total || 0;
      acc.totalOutstanding += inv.balance || 0;
      acc.totalPaid += inv.amountPaid || 0;
      acc.invoiceCount += 1;
      if (late > 0) {
        acc.lateInvoiceCount += 1;
        acc.maxDaysLate = Math.max(acc.maxDaysLate, late);
        acc.sumDaysLate += late;
      }
      return acc;
    },
    { totalInvoiced: 0, totalOutstanding: 0, totalPaid: 0, invoiceCount: 0, lateInvoiceCount: 0, maxDaysLate: 0, sumDaysLate: 0 }
  );

  const onTimeRate = stats.invoiceCount > 0
    ? round2((stats.invoiceCount - stats.lateInvoiceCount) / stats.invoiceCount)
    : 1;
  const avgDaysLate = stats.lateInvoiceCount > 0 ? round2(stats.sumDaysLate / stats.lateInvoiceCount) : 0;

  let tier = 'low';
  const reasons = [];

  if (stats.maxDaysLate >= HIGH_MAX_DAYS_LATE) {
    tier = 'high';
    reasons.push(`An invoice went ${stats.maxDaysLate} days past due`);
  } else if (stats.maxDaysLate >= MEDIUM_MAX_DAYS_LATE) {
    tier = 'medium';
    reasons.push(`An invoice went ${stats.maxDaysLate} days past due`);
  }

  if (stats.lateInvoiceCount >= HIGH_LATE_INVOICE_COUNT && onTimeRate < HIGH_ON_TIME_RATE) {
    tier = 'high';
    reasons.push(`${stats.lateInvoiceCount} of ${stats.invoiceCount} invoices paid late`);
  } else if (stats.lateInvoiceCount >= MEDIUM_LATE_INVOICE_COUNT && tier === 'low') {
    tier = 'medium';
    reasons.push(`${stats.lateInvoiceCount} of ${stats.invoiceCount} invoice${stats.lateInvoiceCount > 1 ? 's' : ''} paid late`);
  }

  if (reasons.length === 0) {
    reasons.push(stats.invoiceCount > 0 ? 'No late-payment history on record' : 'No invoice history yet');
  }

  return {
    ...stats,
    totalInvoiced: round2(stats.totalInvoiced),
    totalOutstanding: round2(stats.totalOutstanding),
    totalPaid: round2(stats.totalPaid),
    onTimeRate,
    avgDaysLate,
    tier,
    reasons,
  };
}

const TIER_RANK = { high: 0, medium: 1, low: 2 };

// invoices: already scoped/filtered Invoice docs (plain objects or Mongoose
// docs both work — only field access, no methods called).
function computeClientRisk(invoices, now = Date.now()) {
  const byClient = new Map();

  for (const inv of invoices) {
    const key = clientKey(inv);
    if (!byClient.has(key)) {
      byClient.set(key, { clientName: inv.clientName || inv.clientEmail || 'Unknown client', clientEmail: inv.clientEmail || null, invoices: [] });
    }
    byClient.get(key).invoices.push(inv);
  }

  return [...byClient.values()]
    .map(({ clientName, clientEmail, invoices: clientInvoices }) => ({
      clientName,
      clientEmail,
      ...scoreClient(clientInvoices, now),
    }))
    .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.totalOutstanding - a.totalOutstanding);
}

module.exports = { computeClientRisk };
