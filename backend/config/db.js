const postgres = require('postgres');

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
        // Convert $1, $2 style to postgres.js format
        let processedQuery = text;
        params.forEach((param, index) => {
          processedQuery = processedQuery.replace(`$${index + 1}`, `$${index + 1}`);
        });
        
        // Use sql with parameters - postgres.js handles this differently
        const result = await sql.unsafe(processedQuery, params);
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