const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const Contact = require('../models/Contact');
const { escapeRegex } = require('../utils/escapeRegex');

router.use(authenticate);

// Contacts isn't part of the client portal — nothing here concerns a client
// account.
router.use(authorize('admin', 'qs', 'project_manager'));

router.get('/', async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectIds = req.query.projectId;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const q = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: q }, { company: q }, { email: q }, { phone: q }, { role: q }];
  }
  const contacts = await Contact.find(filter)
    .populate('projectIds', 'name')
    .sort({ name: 1 });
  res.json({ contacts });
});

router.get('/:id', async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, companyId: req.user.companyId })
    .populate('projectIds', 'name');
  if (!contact) return res.status(404).json({ message: 'Contact not found' });
  res.json({ contact });
});

router.post('/', async (req, res) => {
  const contact = await Contact.create({
    ...req.body,
    companyId: req.user.companyId,
    createdBy: req.user._id,
  });
  res.status(201).json({ contact });
});

router.put('/:id', async (req, res) => {
  const { companyId, ...updates } = req.body;
  const contact = await Contact.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { ...updates, updatedAt: new Date() },
    { new: true }
  );
  if (!contact) return res.status(404).json({ message: 'Contact not found' });
  res.json({ contact });
});

router.delete('/:id', async (req, res) => {
  await Contact.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  res.json({ message: 'Deleted' });
});

module.exports = router;
