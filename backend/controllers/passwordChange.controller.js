const bcrypt = require('bcryptjs');
const { sql } = require('../config/db');
const { body, validationResult } = require('express-validator');

class PasswordChangeController {
  // Change password after security question verification
  static async changePasswordAfterSecurityQuestions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId, newPassword, securityAnswers } = req.body;

      // 1. Verify user exists and must change password
      const userResult = await sql`
        SELECT did, dusername, dmustchangepassword, daccountstatus
        FROM tblusers 
        WHERE did = ${userId}
      `;

      if (userResult.length === 0) {
        return res.status(404).json({
          ok: false,
          message: 'User not found'
        });
      }

      const user = userResult[0];

      if (user.daccountstatus !== 'active') {
        return res.status(403).json({
          ok: false,
          message: 'Account is not active'
        });
      }

      if (!user.dmustchangepassword) {
        return res.status(400).json({
          ok: false,
          message: 'Password change not required for this user'
        });
      }

      // 2. Verify security answers (if provided)
      if (securityAnswers && securityAnswers.length > 0) {
        const verificationResult = await this.verifySecurityAnswers(userId, securityAnswers);
        if (!verificationResult.isValid) {
          return res.status(400).json({
            ok: false,
            message: 'Security answers verification failed'
          });
        }
      }

      // 3. Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // 4. Update user password and reset dmustchangepassword flag
      await sql`
        UPDATE tblusers 
        SET 
          dpasswordhash = ${hashedPassword},
          dmustchangepassword = false,
          tupdatedat = NOW()
        WHERE did = ${userId}
      `;

      res.status(200).json({
        ok: true,
        message: 'Password changed successfully',
        data: {
          userId: userId,
          username: user.dusername,
          mustChangePassword: false
        }
      });

    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        ok: false,
        message: 'Failed to change password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Check if user needs to change password
  static async checkPasswordChangeRequired(req, res) {
    try {
      const { userId } = req.params;

      const userResult = await sql`
        SELECT 
          did,
          dusername,
          dfirstname,
          dlastname,
          dmustchangepassword,
          daccountstatus
        FROM tblusers 
        WHERE did = ${userId}
      `;

      if (userResult.length === 0) {
        return res.status(404).json({
          ok: false,
          message: 'User not found'
        });
      }

      const user = userResult[0];

      res.status(200).json({
        ok: true,
        data: {
          userId: user.did,
          username: user.dusername,
          firstName: user.dfirstname,
          lastName: user.dlastname,
          mustChangePassword: user.dmustchangepassword,
          accountStatus: user.daccountstatus,
          requiresPasswordChange: user.dmustchangepassword && user.daccountstatus === 'active'
        }
      });

    } catch (error) {
      console.error('Check password change required error:', error);
      res.status(500).json({
        ok: false,
        message: 'Failed to check password change requirement'
      });
    }
  }

  // Helper method to verify security answers
  static async verifySecurityAnswers(userId, securityAnswers) {
    try {
      // Get user's stored security answers
      const storedAnswers = await sql`
        SELECT questionid, answer
        FROM tblusersecurityanswers
        WHERE userid = ${userId}
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
}

module.exports = PasswordChangeController;