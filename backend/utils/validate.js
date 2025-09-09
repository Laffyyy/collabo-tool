const { body, validationResult } = require('express-validator');
const { BadRequestError } = require('./errors');

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
    return next(new BadRequestError(message));
  }
  return next();
}

// Specific validators for chat
const validateCreateConversation = [
  body('dname').notEmpty(),
  body('dtype').notEmpty(),
  body('dcreatedBy').notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

const validateAddMessage = [
  body('dconversationId').notEmpty(),
  body('dsenderId').notEmpty(),
  body('dcontent').notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

module.exports = {
  validate,
  validateCreateConversation,
  validateAddMessage
};