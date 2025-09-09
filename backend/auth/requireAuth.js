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
    console.log('[requireAuth] Starting authentication check');
    
    // Check for token in cookies or Authorization header
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    const sessionToken = req.cookies?.session;
    
    console.log('[requireAuth] Token present:', !!token);
    console.log('[requireAuth] Session token present:', !!sessionToken);
    
    if (!token) {
      console.log('[requireAuth] No token found');
      throw new UnauthorizedError('Authentication required');
    }
    
    if (!sessionToken) {
      console.log('[requireAuth] No session token found');
      throw new UnauthorizedError('Session token required');
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, env.JWT_SECRET);
    console.log('[requireAuth] JWT decoded:', { userId: decoded.userId });
    
    // Attach user info to request
    req.user = decoded;
    
    // Fetch and validate session data
    const session = await sessionModel.findBySessionToken(sessionToken);
    console.log('[requireAuth] Session found:', !!session);
    
    if (!session) {
      console.log('[requireAuth] Session not found in database');
      res.clearCookie('token');
      res.clearCookie('session');
      throw new UnauthorizedError('Session not found');
    }
    
    // Check if session is active and not expired
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    
    console.log('[requireAuth] Session active:', session.isActive);
    console.log('[requireAuth] Session expires at:', expiresAt.toISOString());
    console.log('[requireAuth] Current time:', now.toISOString());
    console.log('[requireAuth] Session expired:', expiresAt <= now);
    
    if (!session.isActive || expiresAt <= now) {
      console.log('[requireAuth] Session is invalid or expired');
      res.clearCookie('token');
      res.clearCookie('session');
      throw new UnauthorizedError('Session expired or invalid');
    }
    
    // Attach session to request
    req.session = session;
    console.log('[requireAuth] Session attached to request');
    
    next();
  } catch (err) {
    console.error('[requireAuth] Authentication error:', err.message);
    
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      // Clear invalid cookies
      res.clearCookie('token');
      res.clearCookie('session');
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(err);
    }
  }
}

module.exports = { requireAuth };