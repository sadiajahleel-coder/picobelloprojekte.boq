const mongoose = require('mongoose');
const { calculateBoqItem } = require('../utils/boqCalculations');

const boqItemSchema = new mongoose.Schema({
  versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BoqVersion', required: true },
  item: { type: String, required: true, trim: true },
  description: { type: String },
  unit: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  baseCost: { type: Number, required: true, min: 0 },
  overheadPercent: { type: Number, default: 0, min: 0 },
  profitPercent: { type: Number, default: 0, min: 0 },
  finalUnitPrice: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  options: [
    {
      tier: { type: String, enum: ['basic', 'standard', 'premium'] },
      label: { type: String },
      baseCost: { type: Number, min: 0 },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-calculate on every save
boqItemSchema.pre('save', function (next) {
  const { finalUnitPrice, totalCost } = calculateBoqItem(this);
  this.finalUnitPrice = finalUnitPrice;
  this.totalCost = totalCost;
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BoqItem', boqItemSchema);
