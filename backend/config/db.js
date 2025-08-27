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
      // Add robust connection pool settings
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
      // Add error event handler for pool recovery
      on: {
        error: (err, client) => {
          console.error('Unexpected error on idle client', err);
          
          // Log detailed error information
          if (err.message && err.message.includes('termination')) {
            console.log('Database connection terminated - will reconnect automatically');
          }
          
          // Don't terminate the process on connection errors
          // The pool will create a new client when needed
        }
      }
    });
    
    // Add additional error handling for pool health
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
 * Starts a periodic connection tester to keep the pool healthy
 */
function startConnectionTester() {
  // Test a connection from the pool every 5 minutes
  const interval = 5 * 60 * 1000; // 5 minutes
  
  setInterval(async () => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT 1');
      client.release();
      console.log('Connection test successful:', result.rows[0]);
    } catch (err) {
      console.error('Connection test failed:', err.message);
    }
  }, interval);
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