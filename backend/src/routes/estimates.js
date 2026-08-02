const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { zodValidate, schemas }    = require('../middleware/zodValidate');
const ctrl = require('../controllers/estimateController');

// All estimate routes require a valid JWT
router.use(authenticate);

// Estimates aren't part of the client portal — nothing here concerns a
// client account, so read access is restricted the same as write access.
const canWrite = authorize('admin', 'qs', 'project_manager');
router.post('/calculate', canWrite, zodValidate(schemas.estimateCalculate), ctrl.calculate);
router.get('/',           canWrite, ctrl.list);
router.get('/:id',        canWrite, ctrl.getOne);
router.get('/:id/pdf',    canWrite, ctrl.generatePdf);
router.post('/',      canWrite, zodValidate(schemas.estimate), ctrl.create);
router.put('/:id',    canWrite, zodValidate(schemas.estimate), ctrl.update);
router.delete('/:id', canWrite, ctrl.remove);

module.exports = router;
