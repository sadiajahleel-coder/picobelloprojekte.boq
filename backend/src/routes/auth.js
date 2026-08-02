const express    = require('express');
const router     = express.Router();
const {
  register, login, getMe, googleAuth,
  forgotPassword, resetPassword, deleteAccount,
  listTeam, inviteMember, updateMemberRole, removeMember,
  markOnboarded, bookCall, completeCall,
  updateProfile, changePassword,
  acceptInvite, requestOnboarding, updateMemberPlan, adminResetPassword,
  ownerDashboard, ownerSetPlan,
} = require('../controllers/authController');
const { multerMemoryConfig } = require('../utils/s3Upload');
const upload = multerMemoryConfig();
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { zodValidate, schemas }  = require('../middleware/zodValidate');

router.post('/register',
  authLimiter,
  zodValidate(schemas.register),
  register,
);

router.post('/login',
  authLimiter,
  zodValidate(schemas.login),
  login,
);

router.post('/google', authLimiter, googleAuth);

router.post('/forgot-password',
  authLimiter,
  zodValidate(schemas.forgotPassword),
  forgotPassword,
);

router.post('/reset-password/:token',
  authLimiter,
  zodValidate(schemas.resetPassword),
  resetPassword,
);

router.get('/me', authenticate, getMe);

router.get('/team',            authenticate, listTeam);
router.post('/invite',         authenticate, authorize('admin'), inviteMember);
router.patch('/team/:id/role', authenticate, authorize('admin'), updateMemberRole);
router.patch('/team/:id/plan',     authenticate, authorize('admin'), updateMemberPlan);
router.patch('/team/:id/password', authenticate, authorize('admin'), adminResetPassword);
router.delete('/team/:id',     authenticate, authorize('admin'), removeMember);

router.post('/accept-invite/:token', acceptInvite);
router.post('/request-onboarding', authLimiter, requestOnboarding);
router.patch('/me/profile', authenticate, uploadLimiter, upload.single('avatar'), updateProfile);
router.patch('/me/password', authenticate, changePassword);
router.patch('/me/onboarded',           authenticate, markOnboarded);
router.patch('/me/book-call',           authenticate, bookCall);
router.patch('/team/:id/complete-call', authenticate, authorize('admin'), completeCall);
router.delete('/me', authenticate, deleteAccount);

router.get('/owner/dashboard',        authenticate, ownerDashboard);
router.patch('/owner/users/:id/plan', authenticate, ownerSetPlan);

module.exports = router;
