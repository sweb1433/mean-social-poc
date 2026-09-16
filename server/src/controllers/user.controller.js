const User = require('../models/User');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildPublicUrl, deleteS3Object } = require('../utils/s3File');

// --- self-service (any logged-in user) ---------------------------------

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

// Lightweight "who can I chat with" list - every logged-in user can see every
// other user's name/picture, unlike the paginated admin user list.
const getDirectory = asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } })
    .select('name profilePicture')
    .sort({ name: 1 });

  res.json({ success: true, data: { users } });
});

const updateMe = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (name !== undefined) req.user.name = name;
  await req.user.save();
  res.json({ success: true, data: { user: req.user } });
});

const uploadMyProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded (field name: profilePicture)');

  const previous = req.user.profilePicture;

  req.user.profilePicture = {
    key: req.file.key,
    url: buildPublicUrl(req.file.key),
    originalName: req.file.originalname,
  };
  await req.user.save();

  if (previous?.key) await deleteS3Object(previous.key);

  res.json({ success: true, data: { user: req.user } });
});

const deleteMyProfilePicture = asyncHandler(async (req, res) => {
  const previous = req.user.profilePicture;
  if (!previous) throw ApiError.notFound('No profile picture set');

  req.user.profilePicture = null;
  await req.user.save();
  await deleteS3Object(previous.key);

  res.json({ success: true, data: { user: req.user } });
});

// Runs before the resume upload hits multer/S3, so a user already at the cap
// gets rejected without wasting an S3 write.
const checkResumeLimit = asyncHandler(async (req, _res, next) => {
  if (req.user.resumes.length >= User.MAX_RESUMES) {
    throw ApiError.badRequest(`You can only have up to ${User.MAX_RESUMES} resumes. Delete one first.`);
  }
  next();
});

const uploadMyResume = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded (field name: resume)');

  req.user.resumes.push({
    key: req.file.key,
    url: buildPublicUrl(req.file.key),
    originalName: req.file.originalname,
  });
  await req.user.save();

  res.status(201).json({ success: true, data: { user: req.user } });
});

const deleteMyResume = asyncHandler(async (req, res) => {
  const resume = req.user.resumes.id(req.params.resumeId);
  if (!resume) throw ApiError.notFound('Resume not found');

  const key = resume.key;
  resume.deleteOne();
  await req.user.save();
  await deleteS3Object(key);

  res.json({ success: true, data: { user: req.user } });
});

// --- admin only ----------------------------------------------------------

const listUsers = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const search = (req.query.search || '').trim();

  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { users, total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, data: { user } });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password, role: role || 'user' });
  res.status(201).json({ success: true, data: { user } });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { name, email, role } = req.body;
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;

  await user.save();
  res.json({ success: true, data: { user } });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (String(user._id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own admin account');
  }

  // Clean up this user's S3 objects (profile picture, resumes, post attachments)
  // and their posts, so nothing orphaned is left behind in the bucket or DB.
  const postsWithAttachments = await Post.find({
    author: user._id,
    'attachment.key': { $exists: true },
  });

  const keysToDelete = [
    user.profilePicture?.key,
    ...user.resumes.map((r) => r.key),
    ...postsWithAttachments.map((p) => p.attachment.key),
  ].filter(Boolean);

  await Promise.all(keysToDelete.map((key) => deleteS3Object(key)));
  await Post.deleteMany({ author: user._id });
  await user.deleteOne();

  res.json({ success: true, data: null });
});

module.exports = {
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
};
