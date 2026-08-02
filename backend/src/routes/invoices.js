const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { zodValidate, schemas }    = require('../middleware/zodValidate');
const {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  addPayment, deletePayment, generatePDF, markAsPaid,
  getPublicInvoice,
} = require('../controllers/invoiceController');

// Public routes (no auth)
router.get('/public/:token', getPublicInvoice);

router.use(authenticate);

router.get('/',        getInvoices);
router.get('/:id',     getInvoice);
router.get('/:id/pdf', generatePDF);

router.post('/',   authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.invoice), createInvoice);
router.put('/:id', authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.invoice), updateInvoice);

// Only admin can delete invoices or remove payments
router.delete('/:id',                     authorize('admin'), deleteInvoice);
router.post('/:id/mark-paid',             authorize('admin', 'qs', 'project_manager'), markAsPaid);
router.post('/:id/payments',              authorize('admin', 'qs', 'project_manager'), addPayment);
router.delete('/:id/payments/:paymentId', authorize('admin'), deletePayment);

module.exports = router;
