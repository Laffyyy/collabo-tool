const { query } = require('../config/db');
exports.getAll = async () => {
  const result = await query('SELECT * FROM tblusers', []);
  return result.rows;
};