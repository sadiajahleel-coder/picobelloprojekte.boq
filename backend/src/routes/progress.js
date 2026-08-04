const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { upload } = require('../config/cloudinary');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  getUpdates, createUpdate, updateUpdate, deleteUpdate, getBudgetAlerts,
} = require('../controllers/progressController');

router.use(authenticate);

router.get('/', getUpdates);
router.get('/budget-alerts', getBudgetAlerts);
router.post('/', authorize('admin', 'qs', 'project_manager'), uploadLimiter, upload.array('images', 10), createUpdate);
router.put('/:id', authorize('admin', 'qs', 'project_manager'), uploadLimiter, upload.array('images', 10), updateUpdate);
router.delete('/:id', authorize('admin', 'qs', 'project_manager'), deleteUpdate);

module.exports = router;
