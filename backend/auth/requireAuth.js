const jwt = require('jsonwebtoken');
const { env } = require('../config');
const { UnauthorizedError } = require('../utils/errors');

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new UnauthorizedError('Missing bearer token'));
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    return next();
  } catch (_err) {
    return next(new UnauthorizedError('Invalid token'));
  }
}

module.exports = { requireAuth };

