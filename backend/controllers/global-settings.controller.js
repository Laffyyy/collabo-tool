const GlobalSettingsService = require('../services/global-settings.service');
const { validateRequest } = require('../utils/validate');

/**
 * Save or update general global configuration settings.
 * Expects req.body.settings (object) and uses req.user.id as updatedBy.
 */
const saveGeneralSettings = async (req, res, next) => {
  try {
    if (!req.body || !req.body.settings) {
      return res.status(400).json({
        success: false,
        message: 'Settings object is required.'
      });
    }

    const settings = req.body.settings;
    const updatedBy = req.user.id;

    const result = await GlobalSettingsService.saveGeneralSettings(settings, updatedBy);

    res.status(200).json({
      success: true,
      data: result,
      message: 'General settings saved successfully.'
    });
  } catch (error) {
    console.error('Controller error in saveGeneralSettings:', error);
    next(error);
  }
};

/**
 * Get general settings
 */
async function getGeneralSettings(req, res, next) {
  try {
    const settings = await GlobalSettingsService.getGeneralSettings();
    
    if (!settings) {
      return res.status(200).json({
        success: true,
        data: {
          sessionTimeout: 480, // Default fallback
          dateFormat: "YYYY-MM-DD",
          timeFormat: "24h",
          maxLoginAttempts: 5,
          passwordPolicy: {
            minLength: 8,
            passwordExpiry: 90,
            requireNumbers: true,
            requireLowercase: true,
            requireUppercase: true,
            requireSpecialChars: true
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching general settings:', error);
    next(error);
  }
}

module.exports = {
  saveGeneralSettings,
  getGeneralSettings
};