const authService = require('../services/auth.service');
const SessionModel = require('../model/session.model');
const { getPool } = require('../config/db');
const GlobalSettingsService = require('../services/global-settings.service');


// Initialize SessionModel with database pool
const pool = getPool();
const sessionModel = new SessionModel(getPool());

/**
 * Login controller - handles user authentication requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    
    // Get IP and user agent for session tracking
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const result = await authService.login({ 
      username, 
      password, 
      ipAddress, 
      userAgent 
    });
    
    // For the initial integration, we'll return a simple response
    // that the frontend can use to show an alert
    res.status(200).json({ 
      ok: true,
      exists: result.exists, 
      message: result.message,
      step: result.step,
      userId: result.userId,
      email: result.email,
      username: result.username,
      sessionTimeout: result.sessionTimeout,
      sessionExpiresAt: result.sessionExpiresAt,
      otpExpiresAt: result.otpExpiresAt
    });
  } catch (err) {
    next(err);
  }
}

/**
 * OTP verification controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function verifyOtp(req, res, next) {
  try {
    console.log('OTP verification request body:', req.body);
    const { userId, otp } = req.body;
    console.log(`Extracted userId: ${userId}, otp: ${otp}`);
    
    // Return early if userId is missing
    if (!userId) {
      return res.status(400).json({
        ok: false,
        message: 'User ID is required for OTP verification'
      });
    }
    
    // Get IP and user agent for the session
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const result = await authService.verifyOtp({ userId, otp, ipAddress, userAgent });
    
    // Set cookies for authentication
    const cookieOptions = {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    // Set JWT token in cookie
    res.cookie('token', result.token, cookieOptions);
    
    // Set session token in cookie
    res.cookie('session', result.sessionToken, {
      ...cookieOptions,
      maxAge: result.expiresAt - Date.now() // Use the exact expiry time
    });
    
    res.status(200).json({
      ok: true,
      user: {
        id: result.user.id,
        name: `${result.user.firstName} ${result.user.lastName}`,
        email: result.user.email,
        role: result.user.role,
        username: result.user.username,
        ouId: result.user.ouId,
        mustChangePassword: result.user.mustChangePassword,
        accountStatus: result.user.accountStatus
      },
      token: result.token,
      sessionToken: result.sessionToken,
      message: 'Authentication successful'
    });
  } catch (err) {
    console.error('Error in verifyOtp controller:', err);
    next(err);
  }
}

/**
 * Resend OTP controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function resendOtp(req, res, next) {
  try {
    const { username } = req.body;
    console.log(`Resending OTP for user: ${username}`);
    
    const result = await authService.resendOtp({ username });
    
    res.status(200).json({
      ok: true,
      message: result.message,
      userId: result.userId,
      email: result.email,
      username: result.username
    });
  } catch (err) {
    console.error('Error in resendOtp controller:', err);
    next(err);
  }
}

async function firstTimeSetup(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.firstTimeSetup({ username, password });
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const result = await authService.changePassword({ userId, currentPassword, newPassword });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function setSecurityQuestions(req, res, next) {
  try {
    const userId = req.user.id;
    const { questions } = req.body;
    const result = await authService.setSecurityQuestions({ userId, questions });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { username } = req.body;
    const result = await authService.forgotPassword({ username });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function sendResetLink(req, res, next) {
  try {
    const { username } = req.body;
    const result = await authService.sendResetLink({ username });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function answerSecurityQuestions(req, res, next) {
  try {
    const { username, answers } = req.body;
    const result = await authService.answerSecurityQuestions({ username, answers });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * Logout controller - invalidates the user's session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function logout(req, res, next) {
  try {
    const { user, session } = req;
    
    console.log(`[Auth Controller] Logout request received for user: ${user?.id || 'unknown'}`);
    console.log(`[Auth Controller] Session details: ${JSON.stringify({
      sessionId: session?.id,
      isActive: session?.isActive,
      expiresAt: session?.expiresAt
    })}`);
    
    if (session) {
      // Invalidate the session
      await sessionModel.invalidate(session.id);
      console.log(`[Auth Controller] Session invalidated successfully: ${session.id}`);
    } else {
      console.log('[Auth Controller] No active session found to invalidate');
    }
    
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('session');
    console.log('[Auth Controller] Authentication cookies cleared');
    
    res.status(200).json({ 
      ok: true, 
      message: 'Logged out successfully' 
    });
  } catch (err) {
    console.error('[Auth Controller] Error during logout:', err);
    // Even if there's an error, try to clear cookies
    res.clearCookie('token');
    res.clearCookie('session');
    next(err);
  }
}

/**
 * Get session info including expiry time and session timeout configuration
 */
async function getSessionInfo(req, res, next) {
  try {
    const { session } = req;
    
    // Remove detailed logging for routine checks
    if (!session) {
      return res.status(401).json({
        ok: false,
        message: 'No active session found'
      });
    }
    
    if (!session.expiresAt) {
      return res.status(500).json({
        ok: false,
        message: 'Invalid session data'
      });
    }
    
    // Get session timeout from global settings (keep this logged since it's configuration)
    let sessionTimeoutMinutes = 480;
    try {
      const globalSettings = await GlobalSettingsService.getGeneralSettings();
      if (globalSettings) {
        const settings = typeof globalSettings === 'string' 
          ? JSON.parse(globalSettings) 
          : globalSettings;
        
        if (settings.sessionTimeout && settings.sessionTimeout > 0) {
          sessionTimeoutMinutes = settings.sessionTimeout;
        }
      }
    } catch (error) {
      console.warn('[Auth Controller] Failed to load session timeout from global settings:', error);
    }
    
    const timeRemaining = new Date(session.expiresAt) - new Date();
    
    // Only log when session is about to expire or on errors
    if (timeRemaining <= 5 * 60 * 1000) { // 5 minutes or less
      console.log('[Auth Controller] Session expiring soon:', {
        sessionId: session.id,
        timeRemaining: Math.floor(timeRemaining / 1000) + 's'
      });
    }
    
    res.status(200).json({
      ok: true,
      data: {
        expiresAt: session.expiresAt,
        timeRemaining: Math.max(0, timeRemaining),
        isActive: session.isActive !== false,
        sessionTimeout: sessionTimeoutMinutes
      }
    });
    
  } catch (err) {
    console.error('[Auth Controller] Error in getSessionInfo:', err);
    next(err);
  }
}

/**
 * Refresh session token with dynamic session timeout
 */
async function refreshSession(req, res, next) {
  try {
    const { session } = req;
    
    if (!session) {
      return res.status(401).json({
        ok: false,
        message: 'No active session found'
      });
    }
    
    // Get session timeout from global settings
    let sessionTimeoutMinutes = 480; // Default 8 hours
    try {
      // Fix: Use GlobalSettingsService (capital G) instead of globalSettingsService
      const globalSettings = await GlobalSettingsService.getGeneralSettings();
      if (globalSettings) {
        const settings = typeof globalSettings === 'string' 
          ? JSON.parse(globalSettings) 
          : globalSettings;
        
        if (settings.sessionTimeout && settings.sessionTimeout > 0) {
          sessionTimeoutMinutes = settings.sessionTimeout;
        }
      }
    } catch (error) {
      console.warn('[Auth Controller] Failed to load session timeout from global settings:', error);
      // Continue with default value
    }
    
    // Extend session by configured timeout from now
    const newExpiresAt = new Date(Date.now() + sessionTimeoutMinutes * 60 * 1000);
    
    const updatedSession = await sessionModel.updateExpiry(session.id, newExpiresAt);
    
    if (!updatedSession) {
      return res.status(500).json({
        ok: false,
        message: 'Failed to update session'
      });
    }
    
    res.status(200).json({
      ok: true,
      data: {
        expiresAt: updatedSession.expiresAt,
        timeRemaining: new Date(updatedSession.expiresAt) - new Date(),
        sessionTimeout: sessionTimeoutMinutes
      }
    });
  } catch (err) {
    console.error('[Auth Controller] Error in refreshSession:', err);
    next(err);
  }
}

module.exports = {
  login,
  verifyOtp,
  resendOtp,
  firstTimeSetup,
  changePassword,
  setSecurityQuestions,
  forgotPassword,
  sendResetLink,
  answerSecurityQuestions,
  logout,
  getSessionInfo,
  refreshSession
};

