const ArtisanPrice = require('../models/ArtisanPrice');

const getAll = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.location) filter.location = new RegExp(req.query.location, 'i');

  const prices = await ArtisanPrice.find(filter)
    .populate('createdBy', 'name')
    .sort({ service: 1 });

  res.json({ prices });
};

const create = async (req, res) => {
  const price = await ArtisanPrice.create({ ...req.body, companyId: req.user.companyId, createdBy: req.user._id });
  res.status(201).json({ message: 'Artisan rate created', price });
};

const update = async (req, res) => {
  const { companyId, ...updates } = req.body;
  const price = await ArtisanPrice.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { ...updates, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!price) return res.status(404).json({ message: 'Artisan rate not found' });
  res.json({ message: 'Artisan rate updated', price });
};

const remove = async (req, res) => {
  const price = await ArtisanPrice.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!price) return res.status(404).json({ message: 'Artisan rate not found' });
  res.json({ message: 'Artisan rate deleted' });
};

module.exports = { getAll, create, update, remove };
