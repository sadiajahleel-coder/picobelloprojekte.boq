const ChangeOrder = require('../models/ChangeOrder');
const Notification = require('../models/Notification');
const { getAllowedProjectIds, scopeToProjects } = require('../utils/clientScope');
const { LIST_SAFETY_CAP } = require('../config/limits');

exports.getChangeOrders = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.status) filter.status = req.query.status;

  const allowedIds = await getAllowedProjectIds(req.user);
  if (allowedIds !== null && !scopeToProjects(filter, allowedIds)) return res.json({ orders: [] });

  const orders = await ChangeOrder.find(filter)
    .populate('projectId', 'name client')
    .populate('boqVersionId', 'name')
    .populate('requestedBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(LIST_SAFETY_CAP);

  res.json({ orders });
};

exports.createChangeOrder = async (req, res) => {
  const { projectId, boqVersionId, title, description, reason, originalCost, newCost } = req.body;

  const order = await ChangeOrder.create({
    projectId, boqVersionId: boqVersionId || null,
    title, description, reason,
    originalCost: Number(originalCost),
    newCost: Number(newCost),
    companyId: req.user.companyId,
    requestedBy: req.user._id,
  });

  await order.populate('projectId', 'name');
  res.status(201).json({ order });
};

exports.updateChangeOrder = async (req, res) => {
  const { title, description, reason, originalCost, newCost } = req.body;
  const order = await ChangeOrder.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!order) return res.status(404).json({ message: 'Change order not found' });
  if (order.status !== 'pending') return res.status(400).json({ message: 'Only pending change orders can be edited' });

  if (title !== undefined) order.title = title;
  if (description !== undefined) order.description = description;
  if (reason !== undefined) order.reason = reason;
  if (originalCost !== undefined) order.originalCost = Number(originalCost);
  if (newCost !== undefined) order.newCost = Number(newCost);

  await order.save();
  res.json({ order });
};

exports.decideChangeOrder = async (req, res) => {
  const { decision } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approved or rejected' });
  }

  const order = await ChangeOrder.findOne({ _id: req.params.id, companyId: req.user.companyId })
    .populate('requestedBy', '_id name');
  if (!order) return res.status(404).json({ message: 'Change order not found' });
  if (order.status !== 'pending') return res.status(400).json({ message: 'Change order is already decided' });

  order.status = decision;
  order.approvedBy = req.user._id;
  order.approvedAt = new Date();
  await order.save();

  if (order.requestedBy?._id) {
    await Notification.create({
      userId: order.requestedBy._id,
      title: `Change Order ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your change order "${order.title}" has been ${decision} by ${req.user.name}.`,
      type: decision === 'approved' ? 'success' : 'warning',
    });
  }

  res.json({ order });
};

exports.deleteChangeOrder = async (req, res) => {
  const order = await ChangeOrder.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!order) return res.status(404).json({ message: 'Change order not found' });
  if (order.status !== 'pending' && req.user.role !== 'admin') {
    return res.status(400).json({ message: 'Only pending change orders can be deleted' });
  }
  await order.deleteOne();
  res.json({ message: 'Deleted' });
};
