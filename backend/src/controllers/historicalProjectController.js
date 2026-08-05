const HistoricalProject = require('../models/HistoricalProject');
const { cloudinary, upload } = require('../config/cloudinary');
const { LIST_SAFETY_CAP } = require('../config/limits');

exports.uploadDocument = [
  upload.single('file'),
  async (req, res, next) => {
    try {
      const project = await HistoricalProject.findOne({ _id: req.params.id, companyId: req.user.companyId });
      if (!project) return res.status(404).json({ message: 'Project not found' });
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      // Delete previous document from Cloudinary if it exists
      if (project.documentUrl) {
        try {
          const publicId = project.documentUrl.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');
          await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => {});
        } catch {}
      }

      project.documentUrl  = req.file.path || req.file.secure_url;
      project.documentName = req.file.originalname || req.file.public_id;
      await project.save();
      res.json({ project });
    } catch (err) { next(err); }
  },
];

exports.list = async (req, res, next) => {
  try {
    const projects = await HistoricalProject
      .find({ companyId: req.user.companyId })
      .sort({ completedYear: -1, createdAt: -1 })
      .limit(LIST_SAFETY_CAP)
      .lean();
    res.json({ projects });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const project = await HistoricalProject.create({
      ...req.body,
      companyId: req.user.companyId,
      createdBy: req.user._id,
    });
    res.status(201).json({ project });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyId, ...updates } = req.body;
    const project = await HistoricalProject.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      updates,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ project });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await HistoricalProject.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
