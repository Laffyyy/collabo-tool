const { Pool } = require('pg');
const postgres = require('postgres');

// Database pool for connection reuse
let pool = null;
let sqlClient = null;

/**
 * Get PostgreSQL connection pool
 * @returns {Object} Postgres SQL connection pool
 */
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({ 
      connectionString,
      // Add robust connection pool settings
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      // Add error event handler for pool recovery
      on: {
        error: (err, client) => {
          console.error('Unexpected error on idle client', err);
          
          // Log detailed error information
          if (err.message && err.message.includes('termination')) {
            console.log('Database connection terminated - will reconnect automatically');
          }
        }
      }
    });
    
    // Add explicit error handler to the pool itself to prevent crashes
    pool.on('error', (err) => {
      console.error('Postgres pool error:', err);
      // Don't let this error crash the application
      // The pool will attempt to reconnect on next query
    });
    
    pool.on('connect', () => {
      console.log('New database connection established');
    });
    
    pool.on('remove', () => {
      console.log('Database connection removed from pool');
    });
    
    // Add regular connection testing to keep connections alive
    startConnectionTester();
  }
  return pool;
}

/**
 * Get postgres.js sql client (tagged template)
 * @returns {Function} postgres.js sql function
 */
function getSql() {
  if (!sqlClient) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create a singleton postgres.js client
    sqlClient = postgres(connectionString, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 5,
    });
  }
  return sqlClient;
}

/**
 * Starts a periodic connection tester to keep the pool healthy
 */
function startConnectionTester() {
  // Test a connection from the pool more frequently (every 1 minute instead of 5)
  const interval = 60 * 1000; // 1 minute
  
  setInterval(async () => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT 1');
      client.release();
      console.log('Connection test successful');
    } catch (err) {
      console.error('Connection test failed:', err.message);
      
      // If pool is unresponsive or broken, recreate it
      if (err.message.includes('termination') || err.message.includes('connection')) {
        console.log('Attempting to recreate the connection pool');
        closePool();
        pool = null; // Reset pool to null so getPool() will create a new one
      }
    }
  }, interval);
}

// Create a db object with query method for compatibility
const db = {
  query: async (text, params = []) => {
    const client = await getPool().connect();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    } finally {
      client.release();
    }
  }
};

/**
 * Close all database connections
 */
function closePool() {
  if (pool) {
    pool.end();
    pool = null;
  }
  if (sqlClient) {
    try { sqlClient.end({ timeout: 5 }); } catch (_) {}
    sqlClient = null;
  }
}

module.exports = {
  db,
  getPool,
  closePool,
  // Export a convenience query function for callers that import { query }
  query: db.query,
  // Export postgres.js tagged-template function. Use a thin wrapper to ensure singleton.
  sql: (...args) => getSql()(...args),
  getSql
};
