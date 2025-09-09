const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');
const { generateOtp, generateAlphanumericOtp, verifyOtpCode, sendOtpEmail } = require('../utils/otp');
const { getPool } = require('../config/db');
const UserModel = require('../model/user.model');
const OTPModel = require('../model/otp.model');
const SessionModel = require('../model/session.model');
const UserRoleModel = require('../model/user-role.model');
const RoleModel = require('../model/role.model');
const GlobalSettingsService = require('../services/global-settings.service');


// Initialize UserModel with database pool
const pool = getPool(); // Get the pool once
const userModel = new UserModel(pool);
const otpModel = new OTPModel(pool);
const sessionModel = new SessionModel(pool);
const userRoleModel = new UserRoleModel(pool);
const roleModel = new RoleModel(pool);

// In-memory demo store (replace with DB later)
const users = new Map();
const pendingOtps = new Map(); // username -> { code, expiresAt }

function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.TOKEN_EXP_MINUTES}m` });
}

/**
 * User login function
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.username - User's email/username
 * @param {string} credentials.password - User's password
 * @param {string} credentials.ipAddress - Client IP address
 * @param {string} credentials.userAgent - Client user agent
 * @returns {Promise<Object>} Login result with next step
 */
async function login({ username, password, ipAddress = null, userAgent = null }) {
  try {
    console.log(`[Auth Service] Login attempt for user: ${username}`);
    
    // First check if the user exists in database by email - include sensitive data for auth
    const query = 'SELECT * FROM tblusers WHERE demail = $1';
    const result = await userModel.pool.query(query, [username]);
    
    // If user not found - return generic error message for security
    if (result.rows.length === 0) {
      console.log(`[Auth Service] Login failed - user not found: ${username}`);
      return {
        step: 'FAILED',
        exists: false,
        message: 'Invalid Email/Password'
      };
    }
    
    const userData = result.rows[0];
    console.log(`[Auth Service] User found: ${userData.did}, username: ${userData.dusername}`);
    const passwordHash = userData.dpasswordhash;
    
    // User exists in database - verify password
    if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
      console.log(`[Auth Service] Login failed - invalid password for user: ${username}`);
      return {
        step: 'FAILED',
        exists: true,
        message: 'Invalid Email/Password'
      };
    }
    
    console.log(`[Auth Service] Password verified successfully for user: ${username}`);
    
    // Format the user without sensitive data for the response
    const user = userModel.formatUser(userData);
    console.log(`[Auth Service] Formatted user data:`, JSON.stringify(user));
    
    // Get session timeout from database configuration
    const sessionTimeoutMinutes = await getSessionTimeoutMinutes();
    console.log(`[Auth Service] Using session timeout of ${sessionTimeoutMinutes} minutes`);
    
    // Generate session tokens
    const sessionToken = uuidv4();
    const refreshToken = uuidv4();
    
    // Create session with dynamic timeout from database
    const expiresAt = new Date(Date.now() + sessionTimeoutMinutes * 60 * 1000);
    
    console.log(`[Auth Service] Session will expire at: ${expiresAt.toISOString()}`);
    
    // Create session record in database
    await sessionModel.create({
      userId: user.id,
      sessionToken,
      refreshToken,
      expiresAt,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'Unknown'
    });
    
    console.log(`[Auth Service] Session created with timeout of ${sessionTimeoutMinutes} minutes`);

    // Generate OTP and send it to user's email
    const otpData = await generateAndSendOtp(user.email);
    console.log(`[Auth Service] OTP generated for user: ${username}, expires: ${new Date(otpData.expiresAt).toISOString()}`);
    
    // Store the OTP in the database
    await otpModel.create({
      userId: user.id,
      code: otpData.code,
      expiresAt: new Date(otpData.expiresAt)
    });
    
    console.log(`[Auth Service] OTP stored in database for user: ${user.id}`);
    
    // Return success with user info and session configuration for OTP verification
    return {
      ok: true,
      step: 'OTP',
      exists: true,
      message: 'OTP sent to your email',
      userId: user.id,
      email: user.email,
      username: user.username,
      sessionToken,
      sessionTimeout: sessionTimeoutMinutes,
      sessionExpiresAt: expiresAt.toISOString(),
      otpExpiresAt: new Date(otpData.expiresAt).toISOString()
    };
    
  } catch (error) {
    console.error('[Auth Service] Database login error:', error);
    throw new UnauthorizedError('Authentication error');
  }
}

/**
 * Generate an OTP and send it to user's email
 * @param {string} email - User's email address 
 * @returns {Promise<Object>} OTP data
 */
async function generateAndSendOtp(email) {
  const otpData = generateAlphanumericOtp();
  
  try {
    // Send OTP via email
    await sendOtpEmail(email, otpData.code);
    console.log(`OTP sent to ${email}`);
    console.log(`🔑 DEVELOPMENT MODE: OTP CODE: ${otpData.code}`);
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    console.log(`🔑 DEVELOPMENT MODE - EMAIL FAILED BUT OTP IS: ${otpData.code}`);
    // Log but don't throw so authentication can still proceed
  }
  
  return otpData;
}

/**
 * Verify an OTP code
 * @param {Object} verifyData - Verification data
 * @param {string} verifyData.userId - User ID
 * @param {string} verifyData.otp - OTP code entered by user
 * @returns {Promise<Object>} Verification result with user data and token
 */
async function verifyOtp({ userId, otp, ipAddress = null, userAgent = null }) {
  try {
    console.log(`[Auth Service] Verifying OTP for user ${userId}, IP: ${ipAddress}, UA: ${userAgent?.substring(0, 50)}...`);
    
    // Find the OTP record in the database
    const otpRecord = await otpModel.findActiveByCodeAndUserId(userId, otp);
    
    if (!otpRecord) {
      console.log(`[Auth Service] Invalid or expired OTP for user: ${userId}`);
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    console.log(`[Auth Service] Valid OTP found for user: ${userId}, OTP record ID: ${otpRecord.did}`);
    
    // Mark OTP as used
    await otpModel.markAsUsed(otpRecord.did);
    console.log(`[Auth Service] OTP marked as used: ${otpRecord.did}`);
    
    // Get user info
    const user = await userModel.findById(userId);
    if (!user) {
      console.log(`[Auth Service] User not found after OTP validation: ${userId}`);
      throw new UnauthorizedError('User not found');
    }
    
    console.log(`[Auth Service] User retrieved: ${user.id}, name: ${user.firstName} ${user.lastName}`);
    
    // Get user role(s)
    const userRoles = await userRoleModel.findByUserId(userId);
    console.log('User roles retrieved:', userRoles);
    const userRole = userRoles.length > 0 ? userRoles[0] : null; // Get primary role
    const role = userRole ? userRole.roleName.toLowerCase() : 'user'; // Default to 'user' if no role
    
    // Extract the OU ID from the user role
    const ouId = userRole ? userRole.ouId : null;
    console.log(`[Auth Service] User OU ID: ${ouId || 'Not assigned'} for user: ${userId}`);
    
    console.log(`[Auth Service] User role determined: ${role} for user: ${userId}`);
    
    // Update last login timestamp
    await userModel.updateLastLogin(userId);
    console.log(`[Auth Service] Last login updated for user: ${userId}`);
    
    // Generate JWT token with user info and role
    const token = signToken({ 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: role,
      ouId: ouId,
      name: `${user.firstName} ${user.lastName}`
    });
    console.log(`[Auth Service] JWT token generated for user: ${userId}`);
    
    // Generate session token and create session
    const sessionToken = uuidv4();
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + parseInt(env.SESSION_EXP_HOURS || 24) * 60 * 60 * 1000);
    
    console.log(`[Auth Service] Session tokens generated:
      - Session Token: ${sessionToken}
      - Refresh Token: ${refreshToken.substring(0, 8)}...
      - Expires At: ${expiresAt.toISOString()}`);
    
    // Create session record
    await sessionModel.create({
      userId: user.id,
      sessionToken,
      refreshToken,
      expiresAt,
      ipAddress,
      userAgent
    });
    console.log(`[Auth Service] Session created successfully in database for user: ${userId}`);
    
    return { 
      token,
      sessionToken,
      refreshToken,
      expiresAt,
      user: {
        ...user,
        role,
        ouId
      }
    };
  } catch (error) {
    console.error('[Auth Service] OTP verification error:', error);
    throw new UnauthorizedError('OTP verification failed');
  }
}

/**
 * Resend OTP to user's email
 * @param {Object} userData - User data object
 * @param {string} userData.username - User's email/username
 * @returns {Promise<Object>} Result with success message
 */
async function resendOtp({ username }) {
  try {
    console.log(`Attempting to resend OTP for: ${username}`);
    
    // Check if the input is an email or username
    let user;
    let rawUserData;
    
    if (username.includes('@')) {
      // If it looks like an email - get raw user data for proper property access
      const query = 'SELECT * FROM tblusers WHERE demail = $1';
      const result = await userModel.pool.query(query, [username]);
      
      if (result.rows.length === 0) {
        console.log(`User not found for email: ${username}`);
        throw new BadRequestError('User not found');
      }
      
      rawUserData = result.rows[0];
      user = userModel.formatUser(rawUserData);
    } else {
      // If it looks like a username
      const query = 'SELECT * FROM tblusers WHERE dusername = $1';
      const result = await userModel.pool.query(query, [username]);
      
      if (result.rows.length === 0) {
        console.log(`User not found for username: ${username}`);
        throw new BadRequestError('User not found');
      }
      
      rawUserData = result.rows[0];
      user = userModel.formatUser(rawUserData);
    }
    
    // Use the raw data's did property which contains the UUID
    const userId = rawUserData.did;
    const email = rawUserData.demail;
    
    if (!userId) {
      throw new BadRequestError('Invalid user ID');
    }
    
    if (!email) {
      throw new BadRequestError('Invalid email address');
    }
    
    console.log(`Found user: ${userId}, email: ${email}`);
    
    // Invalidate any existing active OTPs for this user
    await invalidateExistingOtps(userId);
    
    // Generate new OTP and send it to user's email
    const otpData = generateAlphanumericOtp();
    
    try {
      // Send OTP via email - only pass the required parameters
      await sendOtpEmail(email, otpData.code);
      console.log(`New OTP sent to: ${email}`);
      console.log(`🔑 RESEND OTP CODE: ${otpData.code}`);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      console.log(`🔑 RESEND OTP FAILED BUT CODE: ${otpData.code}`);
      // Continue with the process even if email sending fails
    }
    
    console.log(`Creating OTP record for user: ${userId}`);
    
    // Store the new OTP
    await otpModel.create({
      userId: userId,
      code: otpData.code,
      expiresAt: new Date(otpData.expiresAt)
    });
    
    return {
      ok: true,
      message: 'New OTP sent to your email',
      userId: userId,
      email: email,
      username: rawUserData.dusername
    };
  } catch (error) {
    console.error('Resend OTP error:', error);
    throw new BadRequestError('Failed to resend OTP');
  }
}

/**
 * Invalidate any existing active OTPs for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function invalidateExistingOtps(userId) {
  try {
    // This SQL will mark all active OTPs for the user as used
    const query = `
      UPDATE tblotp
      SET dusagestatus = true, tusedat = NOW()
      WHERE duserid = $1 AND dusagestatus = false AND texpiresat > NOW()
    `;
    
    await otpModel.pool.query(query, [userId]);
  } catch (error) {
    console.error('Failed to invalidate existing OTPs:', error);
    // Don't throw here so the overall resend process can continue
  }
}

async function firstTimeSetup({ username, password }) {
  if (users.has(username)) throw new BadRequestError('User already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: `u_${Date.now()}`, username, passwordHash, securityQuestions: [] };
  users.set(username, user);
  return { user: { id: user.id, username } };
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = [...users.values()].find((u) => u.id === userId);
  if (!user) throw new UnauthorizedError('User not found');
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Invalid current password');
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  return { message: 'Password updated' };
}

async function setSecurityQuestions({ userId, questions }) {
  const user = [...users.values()].find((u) => u.id === userId);
  if (!user) throw new UnauthorizedError('User not found');
  user.securityQuestions = questions;
  return { message: 'Security questions set' };
}

async function forgotPassword({ username }) {
  const user = users.get(username);
  if (!user) throw new BadRequestError('User not found');
  // In real implementation, kick off flow (questions or email)
  return { next: 'ANSWER_SECURITY_QUESTIONS' };
}

async function sendResetLink({ username }) {
  const user = users.get(username);
  if (!user) throw new BadRequestError('User not found');
  // Simulate email send
  return { message: 'Reset link sent (simulated)' };
}

async function answerSecurityQuestions({ username, answers }) {
  const user = users.get(username);
  if (!user) throw new BadRequestError('User not found');
  const ok = Array.isArray(answers) && answers.length > 0;
  if (!ok) throw new UnauthorizedError('Incorrect answers');
  const token = signToken({ id: user.id, username });
  return { token };
}

/**
 * Get session timeout from global settings
 */
async function getSessionTimeoutMinutes() {
  try {
    console.log('[Auth Service] Fetching session timeout from global settings...');
    const globalSettings = await GlobalSettingsService.getGeneralSettings();
    
    if (globalSettings) {
      console.log('[Auth Service] Raw global settings:', globalSettings);
      
      const settings = typeof globalSettings === 'string' 
        ? JSON.parse(globalSettings) 
        : globalSettings;
      
      console.log('[Auth Service] Parsed settings:', settings);
      
      if (settings.sessionTimeout && settings.sessionTimeout > 0) {
        console.log(`[Auth Service] Using database session timeout: ${settings.sessionTimeout} minutes`);
        return settings.sessionTimeout;
      }
    }
  } catch (error) {
    console.warn('[Auth Service] Failed to load session timeout from global settings:', error);
  }
  
  console.log('[Auth Service] Using default session timeout: 480 minutes');
  return 480; // Default 8 hours if unable to load from database
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
  getSessionTimeoutMinutes, 
};

