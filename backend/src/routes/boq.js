const express = require('express');
const router = express.Router();
const {
  getVersions,
  getVersion,
  createVersion,
  updateVersion,
  deleteVersion,
  addItem,
  updateItem,
  deleteItem,
  aiDraftBoq,
} = require('../controllers/boqController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { aiLimiter } = require('../middleware/rateLimiter');
const { zodValidate, schemas } = require('../middleware/zodValidate');

// BOQ Versions
router.get('/', authenticate, getVersions);
router.get('/:id', authenticate, getVersion);
router.post('/', authenticate, authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.boqVersion), createVersion);
router.put('/:id', authenticate, authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.boqVersionUpdate), updateVersion);
router.delete('/:id', authenticate, authorize('admin'), deleteVersion);

// AI Draft — not persisted, returns a draft for review before saving via the endpoints above
router.post('/ai-draft', authenticate, authorize('admin', 'qs', 'project_manager'), aiLimiter, aiDraftBoq);

// BOQ Items
router.post('/:id/items', authenticate, authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.boqItem), addItem);
router.put('/:id/items/:itemId', authenticate, authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.boqItemUpdate), updateItem);
router.delete('/:id/items/:itemId', authenticate, authorize('admin', 'qs'), deleteItem);

module.exports = router;
