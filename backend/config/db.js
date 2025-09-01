const postgres = require('postgres');
const { handleJsonbArrayQuery } = require('../utils/jsonbArrayHandler');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = postgres(connectionString);

// Create a db object with query method for compatibility with traditional pg-style queries
const db = {
  query: async (text, params = []) => {
    try {
      // postgres.js uses different parameter binding
      // For parameterized queries, we need to use the sql function differently
      if (params && params.length > 0) {
        // Try to handle JSONB array queries with special handler
        const jsonbResult = await handleJsonbArrayQuery(sql, text, params);
        if (jsonbResult) {
          return jsonbResult;
        }
        
        // For regular queries, use unsafe method
        const result = await sql.unsafe(text, params);
        return { rows: result };
      } else {
        const result = await sql.unsafe(text);
        return { rows: result };
      }
    } catch (error) {
      console.error('Database query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  },
  end: () => sql.end()
};

module.exports = { db, sql };