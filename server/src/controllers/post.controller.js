const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildPublicUrl, deleteS3Object } = require('../utils/s3File');
const { IMAGE_MIME_TYPES } = require('../middleware/upload.middleware');

const AUTHOR_FIELDS = 'name profilePicture';

const createPost = asyncHandler(async (req, res) => {
  const text = (req.body.text || '').trim();

  let attachment;
  if (req.file) {
    attachment = {
      key: req.file.key,
      url: buildPublicUrl(req.file.key),
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      type: IMAGE_MIME_TYPES.includes(req.file.mimetype) ? 'image' : 'document',
    };
  }

  if (!text && !attachment) {
    throw ApiError.badRequest('Post must have text, an attachment, or both');
  }

  const post = await Post.create({ author: req.user._id, text, attachment });
  await post.populate('author', AUTHOR_FIELDS);

  res.status(201).json({ success: true, data: { post } });
});

const getTimeline = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const [posts, total] = await Promise.all([
    Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS),
    Post.countDocuments(),
  ]);

  res.json({
    success: true,
    data: { posts, total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', AUTHOR_FIELDS);
  if (!post) throw ApiError.notFound('Post not found');
  res.json({ success: true, data: { post } });
});

const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');

  const isOwner = String(post.author) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own posts');
  }

  if (post.attachment?.key) await deleteS3Object(post.attachment.key);
  await post.deleteOne();

  res.json({ success: true, data: null });
});

module.exports = { createPost, getTimeline, getPost, deletePost };
