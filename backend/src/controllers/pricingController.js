const QsPrice = require('../models/QsPrice');
const ArtisanPrice = require('../models/ArtisanPrice');
const MaterialPrice = require('../models/MaterialPrice');
const { escapeRegex } = require('../utils/escapeRegex');

const getIntelligence = async (req, res) => {
  const { query, type } = req.query;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  const regex = new RegExp(escapeRegex(query), 'i');
  let results = [];

  if (!type || type === 'qs') {
    const qsPrices = await QsPrice.find({ companyId: req.user.companyId, $or: [{ item: regex }, { category: regex }] });
    results = [
      ...results,
      ...qsPrices.map((p) => ({
        source: 'QS Library',
        name: p.item,
        category: p.category,
        price: p.price,
        unit: p.unit,
        currency: p.currency,
        location: null,
      })),
    ];
  }

  if (!type || type === 'artisan') {
    const artisanPrices = await ArtisanPrice.find({ companyId: req.user.companyId, service: regex });
    results = [
      ...results,
      ...artisanPrices.map((p) => ({
        source: 'Artisan',
        name: p.service,
        category: 'Labour',
        price: p.rate,
        unit: p.rateUnit,
        currency: p.currency,
        location: p.location,
      })),
    ];
  }

  if (!type || type === 'material') {
    const materialPrices = await MaterialPrice.find({
      companyId: req.user.companyId,
      $or: [{ material: regex }, { supplier: regex }],
    });
    results = [
      ...results,
      ...materialPrices.map((p) => ({
        source: 'Material Supplier',
        name: p.material,
        category: 'Materials',
        price: p.price + p.deliveryFee,
        unit: p.unit,
        currency: p.currency,
        location: p.location,
        supplier: p.supplier,
      })),
    ];
  }

  if (results.length === 0) {
    return res.json({ results: [], intelligence: null });
  }

  const prices = results.map((r) => r.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const recommended = parseFloat((avg * 1.1).toFixed(2));

  res.json({
    results,
    intelligence: {
      count: results.length,
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      average: parseFloat(avg.toFixed(2)),
      recommended,
    },
  });
};

module.exports = { getIntelligence };
