const ApiError = require('../utils/ApiError');

function requireRole(...roles) {
  return function (req, _res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = requireRole;
