const { Pool } = require('pg');

// Database pool for connection reuse
let pool = null;

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
 * Close all database connections
 */
function closePool() {
  if (pool) {
    pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  closePool
};