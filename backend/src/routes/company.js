const express = require('express');
const router = express.Router();
const { getCompany, upsertCompany, uploadAsset, getModules, updateModules } = require('../controllers/companyController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { upload } = require('../config/cloudinary');
const { uploadLimiter } = require('../middleware/rateLimiter');

router.get('/', authenticate, getCompany);
router.put('/', authenticate, authorize('admin'), upsertCompany);
router.post('/upload/:type', authenticate, authorize('admin'), uploadLimiter, upload.single('file'), uploadAsset);
router.get('/modules', authenticate, getModules);
router.patch('/modules', authenticate, authorize('admin'), updateModules);

module.exports = router;
