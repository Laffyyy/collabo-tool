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
        // Handle JSONB array queries specially
        if (text.includes('ARRAY[') && text.includes('::jsonb')) {
          // For JSONB arrays, use postgres.js template literal syntax
          if (text.includes('INSERT INTO tblorganizationalunits')) {
            const baseParams = params.slice(0, 4); // First 4 params are regular
            const jsonbParams = params.slice(4); // Remaining params are for JSONB array
            
            if (jsonbParams.length > 0) {
              // Use postgres.js template literal syntax which handles JSONB properly
              const result = await sql`
                INSERT INTO tblorganizationalunits (dname, ddescription, dparentouid, tcreatedat, "jsSettings") 
                VALUES (${baseParams[0]}, ${baseParams[1]}, ${baseParams[2]}, ${baseParams[3]}, ${jsonbParams})
                RETURNING *
              `;
              return { rows: result };
            } else {
              // Empty JSONB array
              const result = await sql`
                INSERT INTO tblorganizationalunits (dname, ddescription, dparentouid, tcreatedat, "jsSettings") 
                VALUES (${baseParams[0]}, ${baseParams[1]}, ${baseParams[2]}, ${baseParams[3]}, ${[]})
                RETURNING *
              `;
              return { rows: result };
            }
          } else if (text.includes('UPDATE tblorganizationalunits')) {
            // Handle UPDATE queries with JSONB arrays
            // Find the JSONB array parameters
            const arrayMatch = text.match(/ARRAY\[(.*?)\]/);
            if (arrayMatch) {
              const jsonbPlaceholders = arrayMatch[1].match(/\$\d+::jsonb/g) || [];
              
              if (jsonbPlaceholders.length > 0) {
                // Get the indices of JSONB parameters
                const jsonbIndices = jsonbPlaceholders.map(placeholder => {
                  return parseInt(placeholder.match(/\$(\d+)/)[1]) - 1;
                });
                
                // Separate regular params from JSONB params
                const regularParams = params.filter((_, index) => !jsonbIndices.includes(index));
                const jsonbParams = jsonbIndices.map(index => params[index]);
                const whereParam = regularParams[regularParams.length - 1]; // ID is always last
                const updateParams = regularParams.slice(0, -1);
                
                // Build the update dynamically
                const setParts = [];
                let paramIndex = 0;
                
                if (text.includes('dname =')) setParts.push('dname');
                if (text.includes('ddescription =')) setParts.push('ddescription');
                if (text.includes('dparentouid =')) setParts.push('dparentouid');
                if (text.includes('"jsSettings" =')) setParts.push('jsSettings');
                if (text.includes('"bisActive" =')) setParts.push('bisActive');
                
                // Create the update object
                const updateObj = {};
                let updateParamIndex = 0;
                
                if (setParts.includes('dname')) updateObj.dname = updateParams[updateParamIndex++];
                if (setParts.includes('ddescription')) updateObj.ddescription = updateParams[updateParamIndex++];
                if (setParts.includes('dparentouid')) updateObj.dparentouid = updateParams[updateParamIndex++];
                if (setParts.includes('jsSettings')) updateObj.jsSettings = jsonbParams;
                if (setParts.includes('bisActive')) updateObj.bisActive = updateParams[updateParamIndex++];
                
                const result = await sql`
                  UPDATE tblorganizationalunits 
                  SET ${sql(updateObj)}
                  WHERE did = ${whereParam}
                  RETURNING *
                `;
                return { rows: result };
              }
            }
          }
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