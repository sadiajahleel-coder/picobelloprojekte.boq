const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { zodValidate, schemas } = require('../middleware/zodValidate');
const {
  getChangeOrders, createChangeOrder, updateChangeOrder, decideChangeOrder, deleteChangeOrder,
} = require('../controllers/changeOrderController');

router.use(authenticate);

router.get('/', getChangeOrders);
router.post('/', authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.changeOrder), createChangeOrder);
router.put('/:id', authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.changeOrderUpdate), updateChangeOrder);
router.patch('/:id/decide', authorize('admin'), decideChangeOrder);
router.delete('/:id', authorize('admin', 'qs', 'project_manager'), deleteChangeOrder);

module.exports = router;
