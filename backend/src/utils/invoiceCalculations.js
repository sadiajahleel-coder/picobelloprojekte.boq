// Extracted from invoiceController.js so the subtotal/VAT/balance math —
// and the auto-mark-paid rule — is directly testable without a database.
// Mutates the invoice-shaped object passed in (matches how Mongoose docs
// are used at every call site) and returns it for convenience.
function recalcTotals(invoice) {
  const subtotal = (invoice.lineItems || []).reduce((s, i) => s + (i.amount || 0), 0);
  const vatAmount = subtotal * (invoice.vatRate || 0) / 100;
  invoice.subtotal   = subtotal;
  invoice.vatAmount  = vatAmount;
  invoice.total      = subtotal + vatAmount;
  invoice.amountPaid = (invoice.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  invoice.balance    = invoice.total - invoice.amountPaid;
  if (invoice.balance <= 0 && invoice.total > 0) invoice.status = 'paid';
  return invoice;
}

module.exports = { recalcTotals };
