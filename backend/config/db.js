const { Pool } = require('pg');
const postgres = require('postgres');

// Database pool for connection reuse
let pool = null;
let sql = null;

/**
 * Get PostgreSQL connection pool
 * @returns {Object} Postgres SQL connection pool
 */
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
  }
  return pool;
}

/**
 * Get postgres SQL function for template literals
 * @returns {Function} Postgres SQL function
 */
function getSql() {
  if (!sql) {
    const connectionString = process.env.DATABASE_URL;
    sql = postgres(connectionString);
  }
  return sql;
}

/**
 * Close all database connections
 */
function closePool() {
  if (pool) {
    pool.end();
    pool = null;
  }
  if (sql) {
    sql.end();
    sql = null;
  }
}

// Export sql for models that use template literals
const sqlInstance = getSql();

module.exports = {
  getPool,
  closePool,
  get sql() {
    return getSql();
  }
};