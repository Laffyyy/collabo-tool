const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');
const { generateOtp, generateAlphanumericOtp, verifyOtpCode, sendOtpEmail } = require('../utils/otp');
const { getPool } = require('../config/db');
const UserModel = require('../model/user.model');
const OTPModel = require('../model/otp.model');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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

const PasswordResetModel = require('../model/passwordReset.model');
const passwordResetModel = new PasswordResetModel(getPool());

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
    
    // Get max login attempts from global settings
    let maxLoginAttempts = 5; // Default value
    try {
      const globalSettings = await GlobalSettingsService.getGeneralSettings();
      if (globalSettings) {
        const settings = typeof globalSettings === 'string' 
          ? JSON.parse(globalSettings) 
          : globalSettings;
        
        if (settings.maxLoginAttempts && settings.maxLoginAttempts > 0) {
          maxLoginAttempts = parseInt(settings.maxLoginAttempts, 10);
        }
      }
      console.log(`[Auth Service] Max login attempts: ${maxLoginAttempts}`);
    } catch (error) {
      console.warn('[Auth Service] Failed to load maxLoginAttempts from global settings:', error);
    }
    
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
    
    // Check if account is already locked
    if (userData.daccountstatus && userData.daccountstatus.toLowerCase() === UserModel.ACCOUNT_STATUS.LOCKED) {
      console.log(`[Auth Service] Login attempt for locked account: ${username}`);
      return {
        step: 'FAILED',
        exists: true,
        message: 'Account is locked. Please contact your administrator.',
        isLocked: true
      };
    }
    
    // Count failed login attempts for this user in the past 24 hours
    const failedAttempts = await userModel.countFailedLoginAttempts(userData.did);
    console.log(`[Auth Service] Previous failed attempts for user ${userData.dusername}: ${failedAttempts}`);
    
    const passwordHash = userData.dpasswordhash;
    
    // User exists in database - verify password
    if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
      console.log(`[Auth Service] Login failed - invalid password for user: ${username}`);
      
      // Track this failed login attempt
      await userModel.trackFailedLoginAttempt(userData.did, ipAddress, userAgent);
      
      // Count total failed attempts including this one
      const totalFailedAttempts = failedAttempts + 1;
      console.log(`[Auth Service] Total failed attempts: ${totalFailedAttempts}`);
      
      // Check if we need to lock the account
      if (totalFailedAttempts >= maxLoginAttempts) {
          // Lock the account
          await userModel.lockAccount(userData.did, 'Too many failed login attempts');
          console.log(`[Auth Service] Account locked due to too many failed attempts: ${username}`);
          
          return {
              step: 'FAILED',
              exists: true,
              message: 'Account has been locked\ndue to too many failed login attempts.\nPlease contact your administrator.',
              isLocked: true
          };
      }
      
      // Return remaining attempts for display to the user
      const attemptsRemaining = maxLoginAttempts - totalFailedAttempts;
      return {
        step: 'FAILED',
        exists: true,
        message: `Invalid Email/Password. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
        attemptsRemaining: attemptsRemaining
      };
    }
    
    console.log(`[Auth Service] Password verified successfully for user: ${username}`);
    
    // Track successful login - this will also update the last login timestamp
    await userModel.trackSuccessfulLogin(userData.did, ipAddress, userAgent);
    
    // Format the user without sensitive data for the response
    const user = userModel.formatUser(userData);
    console.log(`[Auth Service] Formatted user data:`, JSON.stringify(user));
    
    // Proceed with the rest of the login process as before
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

    // Check if this is a first-time user (both conditions must be true)
    const isFirstTimeUser = user.mustChangePassword && user.accountStatus === 'first-time';
    
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
        ouId,
        mustChangePassword: user.mustChangePassword,
        accountStatus: user.accountStatus
      }
    };
  } catch (error) {
    console.error('[Auth Service] OTP verification error:', error);
    throw new UnauthorizedError('Invalid OTP');
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

// Replace the existing forgotPassword function with this implementation
async function forgotPassword({ username }) {
  try {
    console.log(`Processing forgot password for: ${username}`);
    
    // Find user by email
    const user = await userModel.findByEmail(username);
    if (!user) {
      // Return success even if user not found for security reasons
      return { 
        ok: true, 
        message: 'If your email is registered, you will receive a password reset link shortly.' 
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token in database
    await passwordResetModel.create({
      userId: user.id,
      tokenHash: resetTokenHash,
      expiresAt
    });

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken);
    
    console.log(`Password reset email sent to: ${user.email}`);

    return { 
      ok: true, 
      message: 'If your email is registered, you will receive a password reset link shortly.' 
    };
  } catch (error) {
    console.error('Forgot password error:', error);
    throw new BadRequestError('Failed to process password reset request');
  }
}

// Update the sendPasswordResetEmail function
async function sendPasswordResetEmail(email, resetToken) {
  console.log(`=== EMAIL SENDING DEBUG ===`);
  console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST}`);
  console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT}`);
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM}`);
  console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
  
  // Use your existing email configuration
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    debug: true,
    logger: true
  });

  // Test the connection first
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
  } catch (verifyError) {
    console.error('❌ SMTP connection failed:', verifyError);
    throw new Error('Email server connection failed');
  }

  // Create reset link pointing to security questions with token
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/security-question?from=forgot-password&token=${resetToken}`;
  console.log(`Reset link: ${resetLink}`);

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - Collaby',
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #01c0a4;">Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <div style="margin: 20px 0;">
          <a href="${resetLink}" style="background-color: #01c0a4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Your Password
          </a>
        </div>
        <p><strong>This link will expire in 15 minutes.</strong></p>
        <p style="font-size: 12px; color: #777; margin-top: 20px;">
          If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
    `
  };

  console.log(`Sending email from: ${mailOptions.from}`);
  console.log(`Sending email to: ${mailOptions.to}`);

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return result;
  } catch (sendError) {
    console.error('❌ Email sending error:', sendError);
    throw sendError;
  }
}

// Add new function for password reset verification and update
async function resetPassword({ token, newPassword }) {
  try {
    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find valid reset token
    const resetRecord = await passwordResetModel.findValidToken(tokenHash);
    
    if (!resetRecord) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash the new password before updating
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update user password using the correct method signature
    const success = await userModel.updatePassword(resetRecord.duserid, hashedPassword, false);
    
    if (!success) {
      throw new BadRequestError('Failed to update password');
    }

    // Mark reset token as used
    await passwordResetModel.markAsUsed(resetRecord.did);

    return { 
      ok: true, 
      message: 'Password has been reset successfully' 
    };
  } catch (error) {
    console.error('Password reset error:', error);
    throw new BadRequestError(error.message || 'Failed to reset password');
  }
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

// Add this function to validate reset tokens and get user info
async function validateResetToken({ token }) {
  try {
    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find valid reset token
    const resetRecord = await passwordResetModel.findValidToken(tokenHash);
    
    if (!resetRecord) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    return { 
      ok: true, 
      userId: resetRecord.duserid,
      message: 'Valid reset token' 
    };
  } catch (error) {
    console.error('Reset token validation error:', error);
    throw new BadRequestError(error.message || 'Invalid reset token');
  }
}

// Update the module.exports to include validateResetToken
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
  resetPassword,
  validateResetToken, // Add this
  getSessionTimeoutMinutes, 
};

