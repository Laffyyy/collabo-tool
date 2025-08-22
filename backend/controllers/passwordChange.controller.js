const { validationResult } = require('express-validator');
const PasswordChangeService = require('../services/passwordChange.service');

class PasswordChangeController {
  /**
   * Change password for users who must change password
   */
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

      console.log(`Password change request for user: ${userId}`);

      // Use service to handle the password change
      const result = await PasswordChangeService.changePassword(userId, newPassword, securityAnswers);

      console.log(`Password changed successfully for user: ${userId}`);

      res.status(200).json({
        ok: true,
        message: 'Password changed successfully',
        data: result
      });

    } catch (error) {
      console.error('Password change error:', error);
      
      // Handle specific error types
      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('not active') ? 403 :
                        error.message.includes('not required') ? 400 : 500;

      res.status(statusCode).json({
        ok: false,
        message: error.message || 'Failed to change password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check if user needs to change password
   */
  static async checkPasswordChangeRequired(req, res) {
    try {
      const { userId } = req.params;

      const result = await PasswordChangeService.checkPasswordChangeRequired(userId);

      res.status(200).json({
        ok: true,
        data: result
      });

    } catch (error) {
      console.error('Check password change required error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        ok: false,
        message: error.message || 'Failed to check password change requirement'
      });
    }
  }
}

module.exports = PasswordChangeController;