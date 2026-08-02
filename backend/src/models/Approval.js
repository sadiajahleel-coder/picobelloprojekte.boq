const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  boqVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BoqVersion', required: true },
  boqItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'BoqItem', default: null },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['item', 'version'], default: 'item' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  selectedTier: { type: String, enum: ['basic', 'standard', 'premium', null], default: null },
  note: { type: String },
  decidedAt: { type: Date },
}, { timestamps: true });

approvalSchema.index({ boqVersionId: 1, boqItemId: 1, clientId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Approval', approvalSchema);
