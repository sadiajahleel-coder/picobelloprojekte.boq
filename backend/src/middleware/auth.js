const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const { SUPER_EMAILS, OWNER_EMAILS } = require('../config/superEmails');
const { TRIAL_DAYS, TRIAL_EXEMPT_EMAIL } = require('../config/limits');

// Routes (relative to wherever the auth router is mounted, e.g. /api/auth)
// that must stay reachable even once a free trial has expired -- checking
// your own status and deleting your account should never be locked behind
// a paywall. Everything else on a 'free' plan past TRIAL_DAYS is blocked.
const TRIAL_EXEMPT_AUTH_PATHS = new Set(['/me', '/me/book-call']);

function isTrialExpired(user) {
  if (user.plan !== 'free') return false;
  if (user.email === TRIAL_EXEMPT_EMAIL) return false;
  const trialEndsAt = new Date(user.createdAt).getTime() + TRIAL_DAYS * 24 * 3600 * 1000;
  return Date.now() > trialEndsAt;
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Auto-create a company for legacy users who don't have one yet
    if (!user.companyId) {
      const company = await Company.create({ companyName: 'My Company', createdBy: user._id });
      user.companyId = company._id;
      await user.save();
    }

    const isExemptAuthRoute = req.baseUrl.endsWith('/auth') && TRIAL_EXEMPT_AUTH_PATHS.has(req.path);
    if (!isExemptAuthRoute && isTrialExpired(user)) {
      return res.status(402).json({
        message: 'Your 7-day free trial has ended. Upgrade your plan to continue.',
        trialExpired: true,
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

// Gates platform-owner-only routes (the owner dashboard, waitlist admin
// view) at the route level instead of leaving the check buried inside the
// controller, where a future route added to the same file could forget it.
const requireEmailAllowlist = (emails) => (req, res, next) => {
  if (!emails.includes(req.user?.email)) {
    return res.status(403).json({ message: 'Not authorised.' });
  }
  next();
};
const requireSuperEmail = requireEmailAllowlist(SUPER_EMAILS);
const requireOwnerEmail = requireEmailAllowlist(OWNER_EMAILS);

module.exports = { authenticate, authorize, requireSuperEmail, requireOwnerEmail, isTrialExpired };
