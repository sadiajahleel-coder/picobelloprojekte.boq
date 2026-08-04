const WaitlistSignup = require('../models/WaitlistSignup');
const { sendWaitlistNotification } = require('../utils/email');
const logger = require('../utils/logger');

const ROLE_LABELS = {
  quantity_surveyor: 'Quantity Surveyor',
  project_manager: 'Project Manager',
  contractor: 'Contractor / Builder',
  architect: 'Architect',
  civil_structural_engineer: 'Civil / Structural Engineer',
  mep_engineer: 'MEP Engineer',
  site_supervisor: 'Site Supervisor / Foreman',
  developer_client: 'Developer / Client',
  consultant: 'Consultant',
  supplier_vendor: 'Supplier / Vendor',
  student: 'Student',
  other: 'Other',
};

// Public — no auth. Rate-limited at the route level.
const create = async (req, res) => {
  const { name, role, email, phone } = req.body;

  const existing = await WaitlistSignup.findOne({ email });
  if (existing) {
    return res.json({ message: "You're already on the list — we'll email you when new features launch." });
  }

  const signup = await WaitlistSignup.create({ name, role, email, phone });

  sendWaitlistNotification({ name, email, phone, role: ROLE_LABELS[role] || role }).catch((e) =>
    logger.warn('Waitlist notification email failed', { error: e.message }),
  );

  res.status(201).json({ message: "You're on the list! We'll email you when new features launch.", signup: { _id: signup._id } });
};

// Platform owner only — this list isn't scoped to any one company.
// Authorization is enforced by requireOwnerEmail at the route level.
const list = async (req, res) => {
  const signups = await WaitlistSignup.find().sort({ createdAt: -1 }).lean();
  res.json({ signups, roleLabels: ROLE_LABELS });
};

module.exports = { create, list, ROLE_LABELS };
