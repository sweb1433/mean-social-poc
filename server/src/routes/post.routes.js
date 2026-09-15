const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { uploadPostAttachment } = require('../middleware/upload.middleware');
const {
  createPostValidator,
  postIdParamValidator,
  paginationValidator,
} = require('../validators/post.validator');
const { createPost, getTimeline, getPost, deletePost } = require('../controllers/post.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', paginationValidator, validate, getTimeline);
router.post('/', uploadPostAttachment.single('attachment'), createPostValidator, validate, createPost);
router.get('/:id', postIdParamValidator, validate, getPost);
router.delete('/:id', postIdParamValidator, validate, deletePost);

module.exports = router;
