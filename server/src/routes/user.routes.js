const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  uploadProfilePicture,
  uploadResume,
} = require('../middleware/upload.middleware');
const {
  updateMeValidator,
  adminCreateUserValidator,
  adminUpdateUserValidator,
  mongoIdParam,
} = require('../validators/user.validator');
const { paginationValidator } = require('../validators/pagination.validator');
const {
  getMe,
  getDirectory,
  updateMe,
  uploadMyProfilePicture,
  deleteMyProfilePicture,
  checkResumeLimit,
  uploadMyResume,
  deleteMyResume,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller');

const router = express.Router();

router.use(requireAuth);

// --- self-service: registered before the /:id admin routes so "me" is
// never swallowed by the :id param matcher ---
router.get('/me', getMe);
router.get('/directory', getDirectory);
router.patch('/me', updateMeValidator, validate, updateMe);

router.post('/me/profile-picture', uploadProfilePicture.single('profilePicture'), uploadMyProfilePicture);
router.delete('/me/profile-picture', deleteMyProfilePicture);

router.post('/me/resumes', checkResumeLimit, uploadResume.single('resume'), uploadMyResume);
router.delete('/me/resumes/:resumeId', mongoIdParam('resumeId'), validate, deleteMyResume);

// --- admin only ---
router.use(requireRole('admin'));

router.get('/', paginationValidator, validate, listUsers);
router.get('/:id', mongoIdParam('id'), validate, getUserById);
router.post('/', adminCreateUserValidator, validate, createUser);
router.patch('/:id', adminUpdateUserValidator, validate, updateUser);
router.delete('/:id', mongoIdParam('id'), validate, deleteUser);

module.exports = router;
