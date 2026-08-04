const QsPrice = require('../models/QsPrice');
const { escapeRegex } = require('../utils/escapeRegex');

const getAll = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.category) filter.category = new RegExp(escapeRegex(req.query.category), 'i');

  const prices = await QsPrice.find(filter)
    .populate('createdBy', 'name')
    .sort({ category: 1, item: 1 });

  res.json({ prices });
};

const create = async (req, res) => {
  const price = await QsPrice.create({ ...req.body, companyId: req.user.companyId, createdBy: req.user._id });
  res.status(201).json({ message: 'Price entry created', price });
};

const update = async (req, res) => {
  const { companyId, ...updates } = req.body;
  const price = await QsPrice.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { ...updates, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!price) return res.status(404).json({ message: 'Price entry not found' });
  res.json({ message: 'Price entry updated', price });
};

const remove = async (req, res) => {
  const price = await QsPrice.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!price) return res.status(404).json({ message: 'Price entry not found' });
  res.json({ message: 'Price entry deleted' });
};

module.exports = { getAll, create, update, remove };
