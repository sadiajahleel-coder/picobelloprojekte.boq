const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User     = require('../models/User');
const Company  = require('../models/Company');
const Estimate = require('../models/Estimate');
const Invoice  = require('../models/Invoice');
const SiteReport = require('../models/SiteReport');
const HistoricalProject = require('../models/HistoricalProject');
const { sendWelcome, sendPasswordReset, sendBookingConfirmation, sendTeamInvite, sendOnboardingRequest } = require('../utils/email');
const { validateImageBuffer, uploadImageToS3, deleteImageFromS3 } = require('../utils/s3Upload');
const { S3_CONFIGURED } = require('../config/s3');
const { sendWhatsApp } = require('../utils/whatsapp');
const { SUPER_EMAILS } = require('../config/superEmails');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

const register = async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    logger.warn('Registration attempt for already-registered email', { email, ip: getIp(req) });
    return res.status(409).json({ message: 'Email already registered' });
  }

  const company = await Company.create({ companyName: req.body.companyName || 'My Company' });
  const user    = await User.create({ name, email, password, role: 'admin', companyId: company._id, onboarded: false, callBooked: false, callCompleted: false });
  company.createdBy = user._id;
  await company.save();

  logger.info('New user registered', { userId: user._id, email, ip: getIp(req) });

  const token = generateToken(user._id);
  sendWelcome(user).catch((e) => logger.warn('Welcome email failed', { error: e.message }));
  res.status(201).json({ message: 'Registration successful', token, user });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const ip = getIp(req);

  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    logger.warn('Failed login attempt', { email, ip });
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    logger.warn('Login attempt on deactivated account', { userId: user._id, ip });
    return res.status(403).json({ message: 'Account has been deactivated' });
  }

  logger.info('Successful login', { userId: user._id, email, ip });

  const token = generateToken(user._id);
  res.json({ message: 'Login successful', token, user });
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

const googleAuth = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential required' });

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const { name, email, picture } = ticket.getPayload();
  const ip = getIp(req);

  let user = await User.findOne({ email });
  if (!user) {
    const company  = await Company.create({ companyName: 'My Company' });
    const randomPw = crypto.randomBytes(24).toString('hex');
    user = await User.create({ name, email, password: randomPw, role: 'admin', companyId: company._id, avatar: picture, onboarded: false, callBooked: false, callCompleted: false });
    company.createdBy = user._id;
    await company.save();
    logger.info('New user via Google OAuth', { userId: user._id, email, ip });
  }

  if (!user.isActive) {
    logger.warn('Google login on deactivated account', { userId: user._id, ip });
    return res.status(403).json({ message: 'Account deactivated' });
  }

  logger.info('Google login successful', { userId: user._id, email, ip });

  const token = generateToken(user._id);
  res.json({ message: 'Google login successful', token, user });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.json({ message: 'If that email is registered, a reset link has been sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken   = token;
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'https://squaremetre.onrender.com'}/reset-password/${token}`;
  await sendPasswordReset(user, resetUrl);

  logger.info('Password reset requested', { userId: user._id, ip: getIp(req) });
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
};

const resetPassword = async (req, res) => {
  const { token }    = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetPasswordToken:   token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

  user.password             = password;
  user.resetPasswordToken   = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  logger.info('Password reset successful', { userId: user._id, ip: getIp(req) });
  res.json({ message: 'Password reset successful. You can now log in.' });
};

const deleteAccount = async (req, res) => {
  const { _id: userId, companyId } = req.user;
  const ip = getIp(req);

  logger.warn('Account deletion initiated', { userId, companyId, ip });

  await Promise.all([
    Estimate.deleteMany({ companyId }),
    Invoice.deleteMany({ companyId }),
    SiteReport.deleteMany({ companyId }),
    HistoricalProject.deleteMany({ companyId }),
    User.deleteMany({ companyId, _id: { $ne: userId } }),
  ]);

  await Company.findByIdAndDelete(companyId);
  await User.findByIdAndDelete(userId);

  logger.warn('Account and all company data deleted', { userId, companyId, ip });
  res.json({ message: 'Account and all associated data have been permanently deleted.' });
};

const listTeam = async (req, res) => {
  const members = await User.find({ companyId: req.user.companyId, isActive: true })
    .select('name email role createdAt')
    .sort({ createdAt: 1 })
    .lean();
  res.json({ members });
};

const inviteMember = async (req, res) => {
  const { name, email, role, phone } = req.body;
  if (!role || !role.trim()) {
    return res.status(400).json({ message: 'Role is required.' });
  }
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const randomPw = crypto.randomBytes(24).toString('hex');
  const user = await User.create({
    name, email, password: randomPw, role,
    companyId: req.user.companyId,
    onboarded: false,
    inviteToken,
    inviteTokenExpires: Date.now() + 48 * 3600 * 1000,
  });
  logger.info('Team member invited', { invitedBy: req.user._id, newUserId: user._id, role });

  const appUrl = process.env.FRONTEND_URL || 'https://squaremetre.onrender.com';
  const inviteUrl = `${appUrl}/accept-invite/${inviteToken}`;

  sendTeamInvite(user, inviteUrl).catch((e) =>
    logger.warn('Invite email failed', { error: e.message }),
  );

  if (phone) {
    const msg =
      `Hello ${name}! 👋\n\n` +
      `You have been added to *SquareMetre BOQ* as *${role.replace(/_/g, ' ')}*.\n\n` +
      `Click the link below to set your password and sign in:\n${inviteUrl}\n\n` +
      `The link expires in 48 hours.`;
    sendWhatsApp(phone, msg).catch((e) =>
      logger.warn('WhatsApp invite notification failed', { error: e.message }),
    );
  }

  res.status(201).json({ message: 'Invitation sent', user, inviteUrl });
};

const acceptInvite = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }
  const user = await User.findOne({
    inviteToken: token,
    inviteTokenExpires: { $gt: Date.now() },
  });
  if (!user) return res.status(400).json({ message: 'Invite link is invalid or has expired.' });

  user.password = password;
  user.inviteToken = undefined;
  user.inviteTokenExpires = undefined;
  user.onboarded = true;
  await user.save();

  logger.info('Invite accepted', { userId: user._id });
  const authToken = generateToken(user._id);
  res.json({ message: 'Account activated', token: authToken, user });
};

const updateMemberRole = async (req, res) => {
  const { role } = req.body;
  if (!role || !role.trim()) {
    return res.status(400).json({ message: 'Role is required.' });
  }
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot change your own role' });
  }
  const member = await User.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { role },
    { new: true }
  );
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json({ message: 'Role updated', user: member });
};

const removeMember = async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot remove yourself' });
  }
  const member = await User.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json({ message: 'Member removed' });
};

const markOnboarded = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { onboarded: true });
  res.json({ message: 'Onboarded' });
};

const bookCall = async (req, res) => {
  const { slot } = req.body;
  if (!slot) return res.status(400).json({ message: 'slot is required' });
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { callBooked: true, callBookedSlot: slot },
    { new: true },
  );
  sendBookingConfirmation(user, slot).catch((err) =>
    logger.warn('Booking confirmation email failed:', err.message),
  );
  res.json({ message: 'Call booked', user });
};

const completeCall = async (req, res) => {
  const secret = req.headers['x-unlock-secret'];
  if (!secret || secret !== process.env.UNLOCK_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const user = await User.findOneAndUpdate(
    { _id: req.params.id },
    { callCompleted: true },
    { new: true },
  );
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'Call marked complete', user });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters.' });
  }
  const user = await User.findById(req.user._id);
  const valid = await user.comparePassword(currentPassword);
  if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });
  user.password = newPassword;
  await user.save();
  logger.info('Password changed', { userId: user._id });
  res.json({ message: 'Password updated successfully.' });
};

const updateProfile = async (req, res) => {
  const { name, phone, jobTitle } = req.body;
  const updates = {};
  if (name?.trim()) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone.trim();
  if (jobTitle !== undefined) updates.jobTitle = jobTitle.trim();

  if (req.file) {
    validateImageBuffer(req.file.buffer, req.file.mimetype, req.file.size);
    const s3Key = `avatars/${req.user._id}/${Date.now()}.${req.file.originalname.split('.').pop() || 'jpg'}`;
    const { s3Url } = await uploadImageToS3(req.file.buffer, req.file.mimetype, s3Key);
    if (req.user.avatar && req.user.avatar.includes('.amazonaws.com/')) {
      const oldKey = req.user.avatar.split('.amazonaws.com/')[1];
      deleteImageFromS3(oldKey).catch(() => {});
    }
    updates.avatar = s3Url;
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json({ user });
};

// ── updateMemberPlan ──────────────────────────────────────────────────────────
const updateMemberPlan = async (req, res) => {
  if (!SUPER_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ message: 'Not authorised.' });
  }
  const { plan } = req.body;
  if (!['free', 'basic', 'premium'].includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan.' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { plan }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user });
};

// ── adminResetPassword ────────────────────────────────────────────────────────
const adminResetPassword = async (req, res) => {
  if (!SUPER_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ message: 'Not authorised.' });
  }
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  user.password = password;
  await user.save();
  res.json({ message: 'Password reset successfully.' });
};

// ── ownerDashboard ────────────────────────────────────────────────────────────
// Authorization is enforced by requireSuperEmail at the route level.
const ownerDashboard = async (req, res) => {
  const users = await User.find({})
    .select('-password -resetPasswordToken -resetPasswordExpires -inviteToken -inviteTokenExpires')
    .sort({ createdAt: -1 })
    .lean();
  const companyIds = [...new Set(users.map((u) => u.companyId?.toString()).filter(Boolean))];
  const companies = companyIds.length ? await Company.find({ _id: { $in: companyIds } }).select('name').lean() : [];
  const companyMap = Object.fromEntries(companies.map((c) => [c._id.toString(), c.name]));
  const usersWithCompany = users.map((u) => ({
    ...u,
    companyName: companyMap[u.companyId?.toString()] || u.email,
  }));
  res.json({ users: usersWithCompany });
};

// ── ownerSetPlan ──────────────────────────────────────────────────────────────
// Authorization is enforced by requireSuperEmail at the route level.
const ownerSetPlan = async (req, res) => {
  const { plan } = req.body;
  if (!['free', 'basic', 'premium'].includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan.' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { plan }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user });
};

// ── requestOnboarding ─────────────────────────────────────────────────────────
const requestOnboarding = async (req, res) => {
  const { name, email, plan } = req.body;
  if (!name || !email || !plan) {
    return res.status(400).json({ message: 'name, email, and plan are required' });
  }
  sendOnboardingRequest({ name, email, plan }).catch((e) =>
    logger.warn('Onboarding request email failed', { error: e.message }),
  );
  res.json({ message: 'Request received' });
};

module.exports = {
  register, login, getMe, googleAuth,
  forgotPassword, resetPassword, deleteAccount,
  listTeam, inviteMember, updateMemberRole, removeMember,
  markOnboarded, bookCall, completeCall,
  updateProfile, changePassword,
  acceptInvite, requestOnboarding,
  updateMemberPlan, adminResetPassword,
  ownerDashboard, ownerSetPlan,
};
