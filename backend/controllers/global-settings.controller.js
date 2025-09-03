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
 * Get current general global configuration.
 */
const getGeneralSettings = async (req, res, next) => {
  try {
    const result = await GlobalSettingsService.getGeneralSettings();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Controller error in getGeneralSettings:', error);
    next(error);
  }
};

module.exports = {
  saveGeneralSettings,
  getGeneralSettings
};