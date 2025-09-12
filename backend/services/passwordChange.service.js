const bcrypt = require('bcryptjs');
const { sql } = require('../config/db');

class PasswordChangeService {
  /**
   * Verify if user exists and requires password change
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} User data and validation status
   */
  static async validateUserForPasswordChange(userId) {
    const userResult = await sql`
      SELECT did, dusername, dmustchangepassword, daccountstatus
      FROM tblusers 
      WHERE did = ${userId}
    `;

    if (userResult.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult[0];

    if (user.daccountstatus !== 'active' && user.daccountstatus !== 'first-time') {
      throw new Error('Account is not active');
    }

    // Check both conditions for first-time password change requirement
    const isFirstTimeUser = user.dmustchangepassword && user.daccountstatus === 'first-time';
    const requiresPasswordChange = user.dmustchangepassword;

    if (!requiresPasswordChange) {
      throw new Error('Password change not required for this user');
    }

    return {
      ...user,
      isFirstTimeUser
    };
  }

  /**
   * Check if user has existing security answers
   * @param {string} userId - User UUID
   * @returns {Promise<boolean>} Whether user has security answers
   */
  static async hasExistingSecurityAnswers(userId) {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM tblusersecurityanswers
      WHERE duserid = ${userId}
    `;
    
    return parseInt(result[0].count) > 0;
  }

  /**
   * Verify security answers for a user
   * @param {string} userId - User UUID
   * @param {Array} securityAnswers - Array of {questionId, answer}
   * @returns {Promise<Object>} Verification result
   */
  static async verifySecurityAnswers(userId, securityAnswers) {
    try {
      // Get user's stored security answers
      const storedAnswers = await sql`
        SELECT dsecurityquestionid as questionid, danswer as answer
        FROM tblusersecurityanswers
        WHERE duserid = ${userId}
      `;
  
      if (storedAnswers.length === 0) {
        return { isValid: false, message: 'No security answers found for user' };
      }
  
      // Verify each provided answer
      for (const providedAnswer of securityAnswers) {
        const storedAnswer = storedAnswers.find(
          stored => stored.questionid === providedAnswer.questionId
        );
  
        if (!storedAnswer) {
          return { isValid: false, message: 'Security question not found' };
        }
  
        // Remove .toLowerCase() to make comparison case-sensitive
        const providedText = providedAnswer.answer.trim();
        const storedText = storedAnswer.answer.trim();
  
        if (providedText !== storedText) {
          return { isValid: false, message: 'Security answer incorrect' };
        }
      }
  
      return { isValid: true, message: 'Security answers verified' };
  
    } catch (error) {
      console.error('Security answer verification error:', error);
      return { isValid: false, message: 'Verification failed' };
    }
  }

  /**
   * Validate new password against current password and common defaults
   * @param {string} userId - User UUID
   * @param {string} newPassword - New plain text password
   * @returns {Promise<void>} Throws error if validation fails
   */
  static async validateNewPassword(userId, newPassword) {
    // Get current password hash and user data
    const userResult = await sql`
      SELECT dpasswordhash, daccountstatus, demployeeid, dusername
      FROM tblusers 
      WHERE did = ${userId}
    `;

    if (userResult.length === 0) {
      throw new Error('User not found');
    }

    const { dpasswordhash } = userResult[0];

    // Check if new password is same as current password
    const isSameAsCurrentPassword = await bcrypt.compare(newPassword, dpasswordhash);
    if (isSameAsCurrentPassword) {
      throw new Error('New password cannot be the same as your current password');
    }

    // No other validation needed - just check against current password
  }

  /**
   * Hash password with secure salt rounds
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Update user password and reset mustChangePassword flag
   * @param {string} userId - User UUID
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<Object>} Updated user data
   */
  static async updateUserPassword(userId, hashedPassword) {
    // First check if this is a first-time user
    const userCheck = await sql`
      SELECT dmustchangepassword, daccountstatus
      FROM tblusers
      WHERE did = ${userId}
    `;

    const isFirstTimeUser = userCheck[0]?.dmustchangepassword && userCheck[0]?.daccountstatus === 'first-time';

    // Update password and account status
    const result = await sql`
      UPDATE tblusers 
      SET 
        dpasswordhash = ${hashedPassword},
        dmustchangepassword = false,
        daccountstatus = ${isFirstTimeUser ? 'active' : userCheck[0]?.daccountstatus},
        tupdatedat = NOW()
      WHERE did = ${userId}
      RETURNING did, dusername, dmustchangepassword, daccountstatus
    `;

    return result[0];
  }

  /**
   * Complete password change workflow
   * @param {string} userId - User UUID
   * @param {string} newPassword - New plain text password
   * @param {Array} securityAnswers - Security answers for verification (optional for first-time)
   * @returns {Promise<Object>} Result with user data
   */
  static async changePassword(userId, newPassword, securityAnswers = []) {
    // 1. Validate user
    const user = await this.validateUserForPasswordChange(userId);

    // 2. Validate new password against current password and defaults
    await this.validateNewPassword(userId, newPassword);

    // 3. Verify security answers only if provided and user has existing answers
    if (securityAnswers.length > 0) {
      // Check if user has existing security answers
      const hasExistingAnswers = await this.hasExistingSecurityAnswers(userId);

      if (hasExistingAnswers) {
        // User has existing answers, verify them
        const verificationResult = await this.verifySecurityAnswers(userId, securityAnswers);
        if (!verificationResult.isValid) {
          throw new Error(verificationResult.message);
        }
      }
      // If user has no existing answers, skip verification (first-time setup)
    }

    // 4. Hash password
    const hashedPassword = await this.hashPassword(newPassword);

    // 5. Update database
    const updatedUser = await this.updateUserPassword(userId, hashedPassword);

    return {
      userId: updatedUser.did,
      username: updatedUser.dusername,
      mustChangePassword: updatedUser.dmustchangepassword
    };
  }
}

module.exports = PasswordChangeService;