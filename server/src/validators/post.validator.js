const { body, param } = require('express-validator');
const { paginationValidator } = require('./pagination.validator');

const createPostValidator = [
  body('text').optional().trim().isLength({ max: 2000 }),
];

const postIdParamValidator = [param('id').isMongoId().withMessage('Invalid post id')];

module.exports = { createPostValidator, postIdParamValidator, paginationValidator };
