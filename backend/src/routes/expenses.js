const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const multer = require('multer');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { list, create, update, remove } = require('../controllers/expenseController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// Expenses is hidden from the client sidebar -- the read side needs the same
// restriction, not just the writes.
router.get('/', authorize('admin', 'qs', 'project_manager'), list);
router.post('/', authorize('admin', 'qs', 'project_manager'), uploadLimiter, upload.array('receipts', 10), create);
router.put('/:id', authorize('admin', 'qs', 'project_manager'), uploadLimiter, upload.array('receipts', 10), update);
router.delete('/:id', authorize('admin', 'qs', 'project_manager'), remove);

module.exports = router;
