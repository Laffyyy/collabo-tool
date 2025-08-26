const jwt = require('jsonwebtoken');
const { env } = require('../config');
const { UnauthorizedError } = require('../utils/errors');
const { getPool } = require('../config/db');
const SessionModel = require('../model/session.model');

const sessionModel = new SessionModel(getPool());

/**
 * Middleware to require authentication
 */
async function requireAuth(req, res, next) {
  try {
    // Check for token in cookies or Authorization header
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }
    
    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    
    // Only call next() AFTER verification is complete
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(err);
    }
  }
}

module.exports = { requireAuth };