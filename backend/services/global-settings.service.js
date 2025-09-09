const GlobalSettingsModel = require('../model/global-settings.model');

class GlobalSettingsService {
  /**
   * Save or update general global configuration settings.
   * @param {Object} settings - The general settings object
   * @param {string} updatedBy - User UUID
   * @returns {Promise<Object>}
   */
  async saveGeneralSettings(settings, updatedBy) {
    // You could add business logic here if needed
    return await GlobalSettingsModel.upsertGeneralSettings(settings, updatedBy);
  }

  /**
   * Get the current general global configuration settings.
   * @returns {Promise<Object>}
   */
  async getGeneralSettings() {
    return await GlobalSettingsModel.getGeneralSettings();
  }
}

module.exports = new GlobalSettingsService();