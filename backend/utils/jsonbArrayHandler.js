/**
 * JSONB Array Handler Utility
 * Handles special cases for JSONB array queries with postgres.js
 */

/**
 * Handles INSERT queries with JSONB arrays
 * @param {Function} sql - postgres.js sql function
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Object|null} - Query result or null if not handled
 */
async function handleInsertWithJsonbArray(sql, query, params) {
    if (!query.includes('INSERT INTO tblorganizationalunits') || 
        !query.includes('ARRAY[') || 
        !query.includes('::jsonb')) {
        return null;
    }

    const baseParams = params.slice(0, 5); // First 5 params are regular (including dLocation)
    const jsonbParams = params.slice(5); // Remaining params are for JSONB array
    
    if (jsonbParams.length > 0) {
        // Use postgres.js template literal syntax which handles JSONB properly
        const result = await sql`
            INSERT INTO tblorganizationalunits (dname, ddescription, dparentouid, tcreatedat, "dLocation", "jsSettings") 
            VALUES (${baseParams[0]}, ${baseParams[1]}, ${baseParams[2]}, ${baseParams[3]}, ${baseParams[4]}, ${jsonbParams})
            RETURNING *
        `;
        return { rows: result };
    } else {
        // Empty JSONB array
        const result = await sql`
            INSERT INTO tblorganizationalunits (dname, ddescription, dparentouid, tcreatedat, "dLocation", "jsSettings") 
            VALUES (${baseParams[0]}, ${baseParams[1]}, ${baseParams[2]}, ${baseParams[3]}, ${baseParams[4]}, ${[]})
            RETURNING *
        `;
        return { rows: result };
    }
}

/**
 * Handles UPDATE queries with JSONB arrays
 * @param {Function} sql - postgres.js sql function
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Object|null} - Query result or null if not handled
 */
async function handleUpdateWithJsonbArray(sql, query, params) {
    if (!query.includes('UPDATE tblorganizationalunits') || 
        !query.includes('ARRAY[') || 
        !query.includes('::jsonb')) {
        return null;
    }

    // Find the JSONB array parameters
    const arrayMatch = query.match(/ARRAY\[(.*?)\]/);
    if (!arrayMatch) {
        return null;
    }

    const jsonbPlaceholders = arrayMatch[1].match(/\$\d+::jsonb/g) || [];
    
    if (jsonbPlaceholders.length === 0) {
        return null;
    }

    // Get the indices of JSONB parameters
    const jsonbIndices = jsonbPlaceholders.map(placeholder => {
        return parseInt(placeholder.match(/\$(\d+)/)[1]) - 1;
    });
    
    // Separate regular params from JSONB params
    const regularParams = params.filter((_, index) => !jsonbIndices.includes(index));
    const jsonbParams = jsonbIndices.map(index => params[index]);
    const whereParam = regularParams[regularParams.length - 1]; // ID is always last
    const updateParams = regularParams.slice(0, -1);
    
    // Determine column order based on their appearance in the query
    const positions = [];
    const addPos = (colKey, pattern) => {
        const idx = query.indexOf(pattern);
        if (idx !== -1) positions.push({ key: colKey, idx });
    };

    addPos('dname', 'dname =');
    addPos('ddescription', 'ddescription =');
    addPos('dLocation', '"dLocation" =');
    addPos('dparentouid', 'dparentouid =');
    addPos('jsSettings', '"jsSettings" =');
    addPos('bisActive', '"bisActive" =');

    positions.sort((a, b) => a.idx - b.idx);

    // Create the update object in the same order to consume params correctly
    const updateObj = {};
    let updateParamIndex = 0;

    for (const { key } of positions) {
        if (key === 'jsSettings') {
            updateObj.jsSettings = jsonbParams;
        } else if (key === 'dname') {
            updateObj.dname = updateParams[updateParamIndex++];
        } else if (key === 'ddescription') {
            updateObj.ddescription = updateParams[updateParamIndex++];
        } else if (key === 'dLocation') {
            updateObj.dLocation = updateParams[updateParamIndex++];
        } else if (key === 'dparentouid') {
            updateObj.dparentouid = updateParams[updateParamIndex++];
        } else if (key === 'bisActive') {
            updateObj.bisActive = updateParams[updateParamIndex++];
        }
    }
    
    const result = await sql`
        UPDATE tblorganizationalunits 
        SET ${sql(updateObj)}
        WHERE did = ${whereParam}
        RETURNING *
    `;
    return { rows: result };
}

/**
 * Main handler for JSONB array queries
 * @param {Function} sql - postgres.js sql function
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Object|null} - Query result or null if not handled
 */
async function handleJsonbArrayQuery(sql, query, params) {
    // Only handle queries with JSONB arrays
    if (!query.includes('ARRAY[') || !query.includes('::jsonb')) {
        return null;
    }

    // Try INSERT handler first
    const insertResult = await handleInsertWithJsonbArray(sql, query, params);
    if (insertResult) {
        return insertResult;
    }

    // Try UPDATE handler
    const updateResult = await handleUpdateWithJsonbArray(sql, query, params);
    if (updateResult) {
        return updateResult;
    }

    // If no specific handler matched, return null
    return null;
}

module.exports = {
    handleJsonbArrayQuery,
    handleInsertWithJsonbArray,
    handleUpdateWithJsonbArray
};
