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
    pool = new Pool({ 
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for Supabase
      },
      max: 10 // Maximum number of clients in the pool
    });
  }
  return pool;
}

/**
 * Execute SQL query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
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
  query,
  closePool
};