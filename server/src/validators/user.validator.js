const { body, param } = require('express-validator');

const updateMeValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
];

const mongoIdParam = (name) => param(name).isMongoId().withMessage(`Invalid ${name}`);

const adminCreateUserValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
];

const adminUpdateUserValidator = [
  mongoIdParam('id'),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
];

module.exports = {
  updateMeValidator,
  adminCreateUserValidator,
  adminUpdateUserValidator,
  mongoIdParam,
};
