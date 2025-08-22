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

    if (user.daccountstatus !== 'active') {
      throw new Error('Account is not active');
    }

    if (!user.dmustchangepassword) {
      throw new Error('Password change not required for this user');
    }

    return user;
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

        // Compare answers (case-insensitive, trimmed)
        const providedText = providedAnswer.answer.toLowerCase().trim();
        const storedText = storedAnswer.answer.toLowerCase().trim();

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
    const result = await sql`
      UPDATE tblusers 
      SET 
        dpasswordhash = ${hashedPassword},
        dmustchangepassword = false,
        tupdatedat = NOW()
      WHERE did = ${userId}
      RETURNING did, dusername, dmustchangepassword
    `;

    return result[0];
  }

  /**
   * Complete password change workflow
   * @param {string} userId - User UUID
   * @param {string} newPassword - New plain text password
   * @param {Array} securityAnswers - Security answers for verification
   * @returns {Promise<Object>} Result with user data
   */
  static async changePassword(userId, newPassword, securityAnswers = []) {
    // 1. Validate user
    const user = await this.validateUserForPasswordChange(userId);

    // 2. Verify security answers if provided
    if (securityAnswers.length > 0) {
      const verificationResult = await this.verifySecurityAnswers(userId, securityAnswers);
      if (!verificationResult.isValid) {
        throw new Error(verificationResult.message);
      }
    }

    // 3. Hash password
    const hashedPassword = await this.hashPassword(newPassword);

    // 4. Update database
    const updatedUser = await this.updateUserPassword(userId, hashedPassword);

    return {
      userId: updatedUser.did,
      username: updatedUser.dusername,
      mustChangePassword: updatedUser.dmustchangepassword
    };
  }
}

module.exports = PasswordChangeService;