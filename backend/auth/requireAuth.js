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
    // Reduce logging - only log important events
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    const sessionToken = req.cookies?.session;
    
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }
    
    if (!sessionToken) {
      throw new UnauthorizedError('Session token required');
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    
    // Fetch and validate session data
    const session = await sessionModel.findBySessionToken(sessionToken);
    
    if (!session) {
      res.clearCookie('token');
      res.clearCookie('session');
      throw new UnauthorizedError('Session not found');
    }
    
    // Check if session is active and not expired
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    
    if (!session.isActive || expiresAt <= now) {
      res.clearCookie('token');
      res.clearCookie('session');
      throw new UnauthorizedError('Session expired or invalid');
    }
    
    // Attach session to request
    req.session = session;
    
    next();
  } catch (err) {
    // Only log authentication errors, not routine checks
    if (err.name !== 'UnauthorizedError') {
      console.error('[requireAuth] Authentication error:', err.message);
    }
    
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      res.clearCookie('token');
      res.clearCookie('session');
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(err);
    }
  }
}

module.exports = { requireAuth };