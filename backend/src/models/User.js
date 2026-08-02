const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  avatar: { type: String, default: '' },
  phone: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    default: 'admin',
  },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  isActive: { type: Boolean, default: true },
  plan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
  onboarded: { type: Boolean, default: false },
  callBooked:    { type: Boolean, default: false },
  callCompleted: { type: Boolean, default: false },
  callBookedSlot: { type: String, default: '' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  inviteToken: { type: String },
  inviteTokenExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
