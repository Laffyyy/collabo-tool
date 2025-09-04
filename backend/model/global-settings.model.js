const { getPool } = require('../config/db');

class GlobalSettingsModel {
  constructor() {
    this.pool = getPool();
  }

  /**
   * Upsert general settings in tblglobalsettings
   * @param {Object} settings - The general settings object
   * @param {string} updatedBy - User UUID
   * @returns {Promise<Object>}
   */
  async upsertGeneralSettings(settings, updatedBy) {
    const key = 'general';
    const value = JSON.stringify(settings);

    const query = `
      INSERT INTO tblglobalsettings (dsettingkey, dsettingvalue, dupdatedby, tupdatedat)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (dsettingkey)
      DO UPDATE SET dsettingvalue = EXCLUDED.dsettingvalue, dupdatedby = EXCLUDED.dupdatedby, tupdatedat = NOW()
      RETURNING *;
    `;
    const { rows } = await this.pool.query(query, [key, value, updatedBy]);
    return rows[0];
  }

  /**
   * Get general settings from tblglobalsettings
   * @returns {Promise<Object|null>}
   */
  async getGeneralSettings() {
    const key = 'general';
    const query = `
      SELECT dsettingvalue
      FROM tblglobalsettings
      WHERE dsettingkey = $1
      LIMIT 1;
    `;
    const { rows } = await this.pool.query(query, [key]);
    if (rows.length === 0) return null;
    
    // Return the raw JSON string - let the service/controller handle parsing
    return rows[0].dsettingvalue;
  }
}

module.exports = new GlobalSettingsModel();