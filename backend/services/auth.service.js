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
 * @returns {Promise<Object>} Login result with next step
 */
async function login({ username, password }) {
  try {
    // First check if the user exists in database by email - include sensitive data for auth
    const query = 'SELECT * FROM tblusers WHERE demail = $1';
    const result = await userModel.pool.query(query, [username]);
    
    // If user not found
    if (result.rows.length === 0) {
      return {
        step: 'FAILED',
        exists: false,
        message: 'User not found'
      };
    }
    
    const userData = result.rows[0];
    const passwordHash = userData.dpasswordhash;
    
    // User exists in database - verify password
    if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
      return {
        step: 'FAILED',
        exists: true,
        message: 'Invalid password'
      };
    }
    
    // Format the user without sensitive data for the response
    const user = userModel.formatUser(userData);
    
    // Generate OTP and send it to user's email
    const otpData = await generateAndSendOtp(user.email);
    
    // Store the OTP in the database or in-memory store
    await otpModel.create({
      userId: user.id,
      code: otpData.code,
      expiresAt: new Date(otpData.expiresAt)
    });
    
    // Return success with user info for OTP verification
    return {
      ok: true,
      step: 'OTP',
      exists: true,
      message: 'OTP sent to your email',
      userId: user.id,
      email: user.email,
      username: user.username
    };
    
  } catch (error) {
    console.error('Database login error:', error);
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
  } catch (error) {
    console.error('Failed to send OTP email:', error);
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
    console.log(`Verifying OTP for user ${userId}`);
    
    // Find the OTP record in the database
    const otpRecord = await otpModel.findActiveByCodeAndUserId(userId, otp);
    
    if (!otpRecord) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    console.log('Valid OTP found, marking as used');
    
    // Mark OTP as used
    await otpModel.markAsUsed(otpRecord.did);
    
    // Get user info
    const user = await userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    
    // Get user role(s)
    const userRoles = await userRoleModel.findByUserId(userId);
    const userRole = userRoles.length > 0 ? userRoles[0] : null; // Get primary role
    const role = userRole ? userRole.roleName.toLowerCase() : 'user'; // Default to 'user' if no role
    
    // Update last login timestamp
    await userModel.updateLastLogin(userId);
    
    // Generate JWT token with user info and role
    const token = signToken({ 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: role,
      name: `${user.firstName} ${user.lastName}`
    });
    
    // Generate session token and create session
    const sessionToken = uuidv4();
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + parseInt(env.SESSION_EXP_HOURS || 24) * 60 * 60 * 1000);
    
    // Create session record
    await sessionModel.create({
      userId: user.id,
      sessionToken,
      refreshToken,
      expiresAt,
      ipAddress,
      userAgent
    });
    
    return { 
      token,
      sessionToken,
      refreshToken,
      expiresAt,
      user: {
        ...user,
        role,
        mustChangePassword: user.mustChangePassword
      }
    };
  } catch (error) {
    console.error('OTP verification error:', error);
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
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
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
};

