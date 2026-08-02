const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getProfitReport, getCostVariance, getOutstandingInvoices,
  getSupplierPriceHistory, sendPaymentReminders, getCashFlowRisk,
} = require('../controllers/analyticsController');

router.use(authenticate);
router.use(authorize('admin', 'qs', 'project_manager'));

router.get('/profit', getProfitReport);
router.get('/cost-variance', getCostVariance);
router.get('/outstanding', getOutstandingInvoices);
router.get('/supplier-history', getSupplierPriceHistory);
router.post('/send-reminders', sendPaymentReminders);
router.get('/cash-flow-risk', getCashFlowRisk);

module.exports = router;
