const MaterialPrice = require('../models/MaterialPrice');
const { escapeRegex } = require('../utils/escapeRegex');

const getAll = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.material) filter.material = new RegExp(escapeRegex(req.query.material), 'i');
  if (req.query.supplier) filter.supplier = new RegExp(escapeRegex(req.query.supplier), 'i');

  const prices = await MaterialPrice.find(filter)
    .populate('createdBy', 'name')
    .sort({ material: 1 });

  res.json({ prices });
};

const create = async (req, res) => {
  const price = await MaterialPrice.create({ ...req.body, companyId: req.user.companyId, createdBy: req.user._id });
  res.status(201).json({ message: 'Material price created', price });
};

const update = async (req, res) => {
  const { companyId, ...updates } = req.body;
  const price = await MaterialPrice.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { ...updates, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!price) return res.status(404).json({ message: 'Material price not found' });
  res.json({ message: 'Material price updated', price });
};

const remove = async (req, res) => {
  const price = await MaterialPrice.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!price) return res.status(404).json({ message: 'Material price not found' });
  res.json({ message: 'Material price deleted' });
};

module.exports = { getAll, create, update, remove };
