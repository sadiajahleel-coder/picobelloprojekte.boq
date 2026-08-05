const BoqVersion = require('../models/BoqVersion');
const BoqItem = require('../models/BoqItem');
const QsPrice = require('../models/QsPrice');
const Project = require('../models/Project');
const { getAllowedProjectIds, scopeToProjects } = require('../utils/clientScope');
const { checkRate } = require('../utils/rateAlerter');
const { reviewBoq } = require('../utils/boqReviewer');
const { draftBoqItems } = require('../utils/aiBoqDrafter');
const { LIST_SAFETY_CAP } = require('../config/limits');

async function recalculateVersionTotal(versionId) {
  const items = await BoqItem.find({ versionId });
  const total = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  await BoqVersion.findByIdAndUpdate(versionId, {
    totalCost: parseFloat(total.toFixed(2)),
    updatedAt: Date.now(),
  });
}

// ── Versions ───────────────────────────────────────────────────────────────────────

const getVersions = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;

  const allowedIds = await getAllowedProjectIds(req.user);
  if (allowedIds !== null && !scopeToProjects(filter, allowedIds)) return res.json({ versions: [] });

  const versions = await BoqVersion.find(filter)
    .populate('projectId', 'name client')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(LIST_SAFETY_CAP);
  res.json({ versions });
};

const getVersion = async (req, res) => {
  const version = await BoqVersion.findOne({ _id: req.params.id, companyId: req.user.companyId })
    .populate('projectId', 'name client location')
    .populate('createdBy', 'name');
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });

  const allowedIds = await getAllowedProjectIds(req.user);
  if (allowedIds !== null && !allowedIds.includes(String(version.projectId?._id))) {
    return res.status(404).json({ message: 'BOQ version not found' });
  }

  const items = await BoqItem.find({ versionId: req.params.id }).sort({ createdAt: 1 }).lean();
  const qsPrices = await QsPrice.find({ companyId: req.user.companyId }).select('item price').lean();

  const itemsWithAlerts = items.map(item => ({ ...item, rateAlert: checkRate(item, qsPrices) }));
  const missingItems = reviewBoq(items);

  res.json({ version, items: itemsWithAlerts, missingItems });
};

const createVersion = async (req, res) => {
  const version = await BoqVersion.create({ ...req.body, companyId: req.user.companyId, createdBy: req.user._id });
  res.status(201).json({ message: 'BOQ version created', version });
};

const updateVersion = async (req, res) => {
  const version = await BoqVersion.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { ...req.body, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });
  res.json({ message: 'BOQ version updated', version });
};

const deleteVersion = async (req, res) => {
  const version = await BoqVersion.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });
  await BoqItem.deleteMany({ versionId: req.params.id });
  res.json({ message: 'BOQ version and all items deleted' });
};

// ── Items ────────────────────────────────────────────────────────────────────────────

const addItem = async (req, res) => {
  const version = await BoqVersion.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });

  const item = new BoqItem({ ...req.body, versionId: req.params.id });
  await item.save();
  await recalculateVersionTotal(req.params.id);

  res.status(201).json({ message: 'Item added', item });
};

const updateItem = async (req, res) => {
  const version = await BoqVersion.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });

  const item = await BoqItem.findOne({ _id: req.params.itemId, versionId: req.params.id });
  if (!item) return res.status(404).json({ message: 'Item not found' });

  // versionId is excluded so a request body can't relocate the item into a
  // different (potentially another company's) BOQ version.
  const { versionId, ...updates } = req.body;
  Object.assign(item, updates);
  await item.save();
  await recalculateVersionTotal(item.versionId);

  res.json({ message: 'Item updated', item });
};

const deleteItem = async (req, res) => {
  const version = await BoqVersion.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });

  const item = await BoqItem.findOneAndDelete({ _id: req.params.itemId, versionId: req.params.id });
  if (!item) return res.status(404).json({ message: 'Item not found' });

  await recalculateVersionTotal(item.versionId);
  res.json({ message: 'Item deleted' });
};

// ── AI Draft ────────────────────────────────────────────────────────────────────────
// Nothing is persisted here — returns a draft for the user to review and edit before
// creating a real BOQ version/items through the endpoints above.
const aiDraftBoq = async (req, res) => {
  const { description, projectId } = req.body;

  const allowedIds = await getAllowedProjectIds(req.user);
  if (projectId && allowedIds !== null && !allowedIds.includes(String(projectId))) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const [project, qsPrices] = await Promise.all([
    projectId ? Project.findOne({ _id: projectId, companyId: req.user.companyId }).select('name currency') : null,
    QsPrice.find({ companyId: req.user.companyId }).select('item unit price').lean(),
  ]);

  const result = await draftBoqItems(description, {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL,
    projectName: project?.name,
    currency: project?.currency,
    qsPrices,
  });

  res.json(result);
};

module.exports = {
  getVersions, getVersion, createVersion, updateVersion, deleteVersion,
  addItem, updateItem, deleteItem, aiDraftBoq,
};
