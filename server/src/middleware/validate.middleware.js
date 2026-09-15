const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs after a chain of express-validator checks on a route; turns collected
// errors into a single 400 response so controllers never see invalid input.
function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.badRequest('Validation failed', errors));
}

module.exports = validate;
