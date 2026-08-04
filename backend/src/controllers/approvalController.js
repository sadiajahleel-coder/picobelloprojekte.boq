const Approval = require('../models/Approval');
const BoqItem = require('../models/BoqItem');
const BoqVersion = require('../models/BoqVersion');
const Notification = require('../models/Notification');
const { getAllowedProjectIds, scopeToProjects } = require('../utils/clientScope');

// ── Client: get approvals for a version ──────────────────────────────────────────────
const getApprovals = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.boqVersionId) filter.boqVersionId = req.query.boqVersionId;

  if (req.user.role === 'client') {
    // Clients only see their own approvals
    filter.clientId = req.user._id;
  } else {
    const allowedIds = await getAllowedProjectIds(req.user);
    if (allowedIds !== null && !scopeToProjects(filter, allowedIds)) return res.json({ approvals: [] });
  }

  const approvals = await Approval.find(filter)
    .populate('boqItemId', 'item unit quantity baseCost options')
    .populate('clientId', 'name email')
    .sort({ updatedAt: -1 });

  res.json({ approvals });
};

// Client: submit item decision
const submitItemDecision = async (req, res) => {
  const { projectId, boqVersionId, boqItemId, status, selectedTier, note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected' });
  }

  const version = await BoqVersion.findOne({ _id: boqVersionId, companyId: req.user.companyId });
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });

  const item = await BoqItem.findOne({ _id: boqItemId, versionId: boqVersionId });
  if (!item) return res.status(404).json({ message: 'BOQ item not found' });

  // selectedTier must match an existing option if provided
  if (selectedTier && item.options && item.options.length > 0) {
    const valid = item.options.some((o) => o.tier === selectedTier);
    if (!valid) return res.status(400).json({ message: 'Invalid tier selection' });
  }

  const approval = await Approval.findOneAndUpdate(
    { boqVersionId, boqItemId, clientId: req.user._id },
    {
      companyId: req.user.companyId,
      projectId,
      boqVersionId,
      boqItemId,
      clientId: req.user._id,
      type: 'item',
      status,
      selectedTier: selectedTier || null,
      note: note || '',
      decidedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  res.json({ approval });
};

// Client: approve/reject entire BOQ version
const submitVersionDecision = async (req, res) => {
  const { boqVersionId } = req.params;
  const { projectId, status, note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected' });
  }

  const version = await BoqVersion.findOne({ _id: boqVersionId, companyId: req.user.companyId });
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });

  const approval = await Approval.findOneAndUpdate(
    { boqVersionId, boqItemId: null, clientId: req.user._id, type: 'version' },
    {
      companyId: req.user.companyId,
      projectId,
      boqVersionId,
      boqItemId: null,
      clientId: req.user._id,
      type: 'version',
      status,
      note: note || '',
      decidedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // Notify QS/Admin of client decision
  if (status === 'approved') {
    version.status = 'approved';
    await version.save();
  }

  await Notification.create({
    userId: version.createdBy,
    title: `BOQ Version ${status === 'approved' ? 'Approved' : 'Rejected'} by Client`,
    message: `Client ${req.user.name} has ${status} the BOQ version "${version.name}".`,
    type: status === 'approved' ? 'success' : 'warning',
  });

  res.json({ approval });
};

// Admin/QS: get pending approvals across all versions
const getPendingApprovals = async (req, res) => {
  const approvals = await Approval.find({ status: 'pending', companyId: req.user.companyId })
    .populate('boqVersionId', 'name')
    .populate('boqItemId', 'item')
    .populate('clientId', 'name email')
    .populate('projectId', 'name')
    .sort({ createdAt: -1 });

  res.json({ approvals });
};

exports.getApprovals = getApprovals;
exports.submitItemDecision = submitItemDecision;
exports.submitVersionDecision = submitVersionDecision;
exports.getPendingApprovals = getPendingApprovals;
