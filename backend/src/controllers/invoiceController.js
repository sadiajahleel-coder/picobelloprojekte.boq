const crypto   = require('crypto');
const Invoice  = require('../models/Invoice');
const Company  = require('../models/Company');
const Estimate = require('../models/Estimate');
const Project  = require('../models/Project');
const { getAllowedProjectIds, scopeToProjects } = require('../utils/clientScope');
const PDFDocument = require('pdfkit');

// ── helpers ────────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function recalcTotals(invoice) {
  const subtotal = (invoice.lineItems || []).reduce((s, i) => s + (i.amount || 0), 0);
  const vatAmount = subtotal * (invoice.vatRate || 0) / 100;
  invoice.subtotal   = subtotal;
  invoice.vatAmount  = vatAmount;
  invoice.total      = subtotal + vatAmount;
  invoice.amountPaid = (invoice.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  invoice.balance    = invoice.total - invoice.amountPaid;
  if (invoice.balance <= 0 && invoice.total > 0) invoice.status = 'paid';
}

// ── CRUD ────────────────────────────────────────────────────────────────────────────
exports.getInvoices = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.status)    filter.status    = req.query.status;
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.user.role === 'client') {
    filter.clientId = req.user._id;
  } else {
    const allowedIds = await getAllowedProjectIds(req.user);
    if (allowedIds !== null && !scopeToProjects(filter, allowedIds)) return res.json({ invoices: [] });
  }
  const invoices = await Invoice.find(filter)
    .populate('projectId', 'name')
    .populate('clientId',  'name email phone')
    .sort({ createdAt: -1 });
  res.json({ invoices });
};

exports.getInvoice = async (req, res) => {
  const filter = { _id: req.params.id, companyId: req.user.companyId };
  if (req.user.role === 'client') {
    filter.clientId = req.user._id;
  }
  const invoice = await Invoice
    .findOne(filter)
    .populate('projectId', 'name')
    .populate('clientId',  'name email phone');
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  if (req.user.role !== 'client') {
    const allowedIds = await getAllowedProjectIds(req.user);
    if (allowedIds !== null && !allowedIds.includes(String(invoice.projectId?._id))) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
  }

  res.json({ invoice });
};

exports.createInvoice = async (req, res) => {
  let { projectId, clientId, items = [], vatRate = 0, currency = 'NGN',
        dueDate, notes, bankDetails, status, estimateId } = req.body;

  // Pre-populate from estimate if provided
  if (estimateId) {
    const est = await Estimate.findOne({ _id: estimateId, companyId: req.user.companyId });
    if (est) {
      if (!items.length && est.lineItems?.length) items = est.lineItems;
      if (!projectId && est.projectId) projectId = est.projectId;
      if (!clientId  && est.clientId)  clientId  = est.clientId;
      if (!vatRate   && est.vatRate)   vatRate   = est.vatRate;
      if (!currency  && est.currency)  currency  = est.currency;
      if (!notes     && est.notes)     notes     = est.notes;
    }
  }

  // A client isn't picked directly when creating an invoice — it's inherited
  // from whichever project the invoice is linked to, so the client portal's
  // scoping (Project.assignedClientId) stays the single source of truth.
  if (projectId && !clientId) {
    const project = await Project.findOne({ _id: projectId, companyId: req.user.companyId });
    if (project?.assignedClientId) clientId = project.assignedClientId;
  }

  const subtotal  = items.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.unitPrice || 0)), 0);
  const vatAmount = subtotal * vatRate / 100;
  const total     = subtotal + vatAmount;

  // auto-number
  const count = await Invoice.countDocuments({ companyId: req.user.companyId });
  const invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`;

  const mappedItems = items.map((i) => ({
    description : i.description,
    qty         : Number(i.qty        || 0),
    unitPrice   : Number(i.unitPrice  || 0),
    amount      : Number(i.qty || 0) * Number(i.unitPrice || 0),
  }));

  const invoice = await Invoice.create({
    companyId: req.user.companyId,
    invoiceNumber,
    projectName: req.body.projectName || '',
    clientName:  req.body.clientName  || '',
    clientEmail: req.body.clientEmail || '',
    clientPhone: req.body.clientPhone || '',
    clientAddress: req.body.clientAddress || '',
    projectId, clientId,
    lineItems: mappedItems,
    subtotal, vatRate, vatAmount, total,
    currency, dueDate, notes, bankDetails,
    balance: total,
    publicToken: crypto.randomBytes(20).toString('hex'),
    status: status || 'draft',
  });
  res.status(201).json({ invoice });
};

exports.updateInvoice = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  const { items, vatRate, ...rest } = req.body;
  Object.assign(invoice, rest);
  if (items)  invoice.lineItems = items.map((i) => ({ ...i, amount: Number(i.qty || 0) * Number(i.unitPrice || 0) }));
  if (vatRate !== undefined) invoice.vatRate = vatRate;
  recalcTotals(invoice);
  await invoice.save();
  res.json({ invoice });
};

exports.deleteInvoice = async (req, res) => {
  await Invoice.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  res.json({ message: 'Deleted' });
};

exports.addPayment = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
  const maxAllowed = invoice.total - (invoice.amountPaid || 0);
  if (amount > maxAllowed + 0.01) {
    return res.status(400).json({ message: `Payment of ${amount} exceeds outstanding balance of ${maxAllowed.toFixed(2)}` });
  }
  invoice.payments.push({
    amount     : Math.min(amount, maxAllowed),
    method     : req.body.method     || 'cash',
    reference  : req.body.reference  || '',
    paymentDate: req.body.paymentDate || new Date(),
    note       : req.body.note       || '',
  });
  recalcTotals(invoice);
  await invoice.save();
  res.json({ invoice });
};

exports.deletePayment = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  invoice.payments = invoice.payments.filter((p) => p._id.toString() !== req.params.paymentId);
  recalcTotals(invoice);
  await invoice.save();
  res.json({ invoice });
};

exports.markAsPaid = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (invoice.balance <= 0) return res.json({ invoice });
  invoice.payments.push({
    amount     : invoice.balance,
    method     : req.body.method    || 'cash',
    reference  : req.body.reference || '',
    paymentDate: new Date(),
    note       : 'Manually marked as paid',
  });
  recalcTotals(invoice);
  await invoice.save();
  res.json({ invoice });
};

// ── PDF ─────────────────────────────────────────────────────────────────────────────────
exports.generatePDF = async (req, res) => {
  const invoice = await Invoice
    .findOne({ _id: req.params.id, companyId: req.user.companyId })
    .lean();
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  const company = await Company.findById(req.user.companyId).lean();
  const co = company || {};

  const PRIMARY    = '#0f2d5a';
  const LIGHT_BLUE = '#dbeafe';
  const GRAY       = '#4b5563';
  const LIGHT_GRAY = '#f3f4f6';

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;
  const M = 50;

  // Header band
  doc.rect(0, 0, W, 130).fill(PRIMARY);

  // Logo placeholder
  try {
    const fs   = require('fs');
    const path = require('path');
    const logo = path.join(__dirname, '../../public/logo.png');
    if (fs.existsSync(logo)) {
      doc.image(logo, M, 20, { height: 50 });
    } else {
      doc.font('Helvetica-Bold').fontSize(22).fillColor(LIGHT_BLUE).text('PICO BELLO', M, 30);
      doc.font('Helvetica').fontSize(9).fillColor(LIGHT_BLUE).text('PROJEKTE', M, 55);
    }
  } catch { /**/ }

  // Company info (right side of header)
  const companyInfo = [
    co.companyName  || 'SquareMetre',
    co.address      || '',
    co.phone        || '',
    co.email        || '',
    co.rcNumber ? `RC: ${co.rcNumber}` : '',
  ].filter(Boolean);
  doc.font('Helvetica').fontSize(8).fillColor(LIGHT_BLUE);
  companyInfo.forEach((line, i) => {
    doc.text(line, W - 220, 25 + i * 14, { width: 170, align: 'right' });
  });

  // INVOICE title
  doc.font('Helvetica-Bold').fontSize(28).fillColor('white').text('INVOICE', M, 88);

  // Invoice meta box
  let y = 150;
  const COL2 = W / 2 + 20;

  // Bill To
  doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text('BILL TO', M, y);
  y += 14;
  const client = invoice.clientId || {};
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(client.name || 'Client', M, y);
  y += 14;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY);
  if (client.email) { doc.text(client.email, M, y); y += 12; }
  if (client.phone) { doc.text(client.phone, M, y); y += 12; }
  if (invoice.projectId?.name) { doc.text(`Project: ${invoice.projectId.name}`, M, y); y += 12; }

  // Invoice details (right column)
  const metaY = 150;
  const metaItems = [
    ['Invoice No',   invoice.invoiceNumber],
    ['Date Issued',  fmtDate(invoice.createdAt)],
    ['Due Date',     fmtDate(invoice.dueDate)],
    ['Status',       (invoice.status || '').toUpperCase()],
    ['Currency',     invoice.currency || 'NGN'],
  ];
  metaItems.forEach(([label, value], i) => {
    const my = metaY + i * 20;
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(label, COL2, my, { width: 80 });
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text(value || '—', COL2 + 85, my, { width: 130, align: 'right' });
  });

  // Divider
  y = Math.max(y, metaY + metaItems.length * 20) + 20;
  doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  y += 16;

  // Items table header
  doc.rect(M, y, W - M * 2, 22).fill(PRIMARY);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('white');
  doc.text('Description',     M + 6,          y + 6, { width: 220 });
  doc.text('Qty',             M + 232,        y + 6, { width: 50,  align: 'right' });
  doc.text('Unit Price',      M + 290,        y + 6, { width: 80,  align: 'right' });
  doc.text('Amount',          W - M - 80,     y + 6, { width: 74,  align: 'right' });
  y += 22;

  // Items rows
  (invoice.lineItems || []).forEach((item, idx) => {
    const rowH = 20;
    if (idx % 2 === 0) doc.rect(M, y, W - M * 2, rowH).fill(LIGHT_GRAY);
    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    doc.text(item.description || '', M + 6, y + 5, { width: 220 });
    doc.text(String(item.qty  || 0),  M + 232, y + 5, { width: 50,  align: 'right' });
    doc.text(fmt(item.unitPrice),     M + 290, y + 5, { width: 80,  align: 'right' });
    doc.text(fmt(item.amount),        W - M - 80, y + 5, { width: 74, align: 'right' });
    y += rowH;
  });

  y += 12;

  // Totals block
  const totalsX = W / 2 + 20;
  const totalsW = W - M - totalsX;

  const drawRow = (label, value, bold = false) => {
    if (bold) {
      doc.rect(totalsX, y - 2, totalsW, 20).fill(PRIMARY);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('white')
        .text(label, totalsX + 5, y + 2, { width: totalsW / 2 - 5 })
        .text(`${invoice.currency} ${value}`, totalsX + totalsW / 2, y + 2, { width: totalsW / 2 - 5, align: 'right' });
      y += 20;
    } else {
      doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(label, totalsX + 5, y, { width: totalsW / 2 - 5 });
      doc.fillColor('#111827').text(`${invoice.currency} ${value}`, totalsX + totalsW / 2, y, { width: totalsW / 2 - 5, align: 'right' });
      y += 16;
    }
  };
  drawRow('Subtotal', fmt(invoice.subtotal));
  if (invoice.vatRate > 0) drawRow(`VAT (${invoice.vatRate}%)`, fmt(invoice.vatAmount));
  drawRow('GRAND TOTAL', fmt(invoice.total), true);
  y += 4;
  drawRow('Amount Paid', fmt(invoice.amountPaid));
  drawRow('Balance Due', fmt(invoice.balance));

  // Bank details
  if (invoice.bankDetails) {
    y += 20;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text('PAYMENT DETAILS', M, y);
    y += 12;
    doc.font('Helvetica').fontSize(9).fillColor('#111827').text(invoice.bankDetails, M, y, { width: W / 2 - M - 20 });
  }

  // Notes
  if (invoice.notes) {
    y += 30;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text('NOTES', M, y);
    y += 12;
    doc.font('Helvetica').fontSize(9).fillColor('#111827').text(invoice.notes, M, y, { width: W - M * 2 });
  }

  // Footer
  doc.rect(0, doc.page.height - 40, W, 40).fill(PRIMARY);
  doc.font('Helvetica').fontSize(7.5).fillColor(LIGHT_BLUE)
    .text(
      `${co.companyName || ''}  ·  ${invoice.invoiceNumber}  ·  Generated ${fmtDate(new Date())}`,
      M, doc.page.height - 24, { width: W - M * 2, align: 'center' }
    );

  doc.end();
};

// ── Public invoice view (no auth, by publicToken) ──────────────────────────────────────
// Clients view the invoice and any bank-transfer details here; payments are recorded
// manually by staff via addPayment. There is no online payment gateway wired up.
exports.getPublicInvoice = async (req, res) => {
  const invoice = await Invoice.findOne({ publicToken: req.params.token })
    .select('-payments.note -companyId');
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json({ invoice });
};
