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
    const sessionToken = req.cookies?.session;
    
    if (!token || !sessionToken) {
      throw new UnauthorizedError('Authentication required');
    }
    
    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // Verify session exists and is active
    const session = await sessionModel.findBySessionToken(sessionToken);
    if (!session || !session.isActive || new Date(session.expiresAt) < new Date()) {
      throw new UnauthorizedError('Session expired');
    }
    
    // Check if the token's user ID matches the session's user ID
    if (decoded.id !== session.userId) {
      throw new UnauthorizedError('Invalid session');
    }
    
    // Attach user and session info to request
    req.user = decoded;
    req.session = session;
    
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