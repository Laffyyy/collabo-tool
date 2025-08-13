const { validationResult } = require('express-validator');
const { BadRequestError } = require('./errors');

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
    return next(new BadRequestError(message));
  }
  return next();
}

module.exports = { validate };

