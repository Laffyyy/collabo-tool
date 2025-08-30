// OU Management Service
// This service handles all OU (Organizational Unit) related operations
const OUmodel = require('../model/ou.model');
const { mergeSettings, transformSettingsToJSSettings } = require('../utils/settingsTransformer');
const ouModel = new OUmodel();

/**
 * Get OUs with pagination, sorting, and optional search
 * @param {number|string} start - Offset to start from
 * @param {number|string} limit - Number of records per page
 * @param {string} sort - Sort direction (ASC|DESC)
 * @param {string} sortby - Column to sort by
 * @param {string} search - Enable search ('true'|'false')
 * @param {string} searchby - Column to search by
 * @param {string} searchvalue - Search term
 * @param {string} isactive - Filter by active status ('true'|'false')
 * @returns {Object} - Paginated OU data
 */
async function getOU(start, limit, sort, sortby, search, searchby, searchvalue, isactive) {
    try {
        const startInt = Number.isInteger(start) ? start : parseInt(start || 0);
        const limitInt = Number.isInteger(limit) ? limit : parseInt(limit || 10);

        const total = await ouModel.getOUCount(search, searchby, searchvalue, isactive);
        const rows = await ouModel.getOUs(startInt, limitInt, sort, sortby, search, searchby, searchvalue, isactive);

        const totalPages = limitInt > 0 ? Math.ceil(total / limitInt) : 0;
        const page = limitInt > 0 ? Math.floor(startInt / limitInt) + 1 : 1;

        return {
            data: rows,
            total,
            start: startInt,
            limit: limitInt,
            page,
            totalPages
        };
    } catch (error) {
        throw new Error(`Failed to get OUs: ${error.message}`);
    }
}

/**
 * Get deactive OUs with pagination and sorting
 * @param {number} howmany - Number of records per page
 * @param {number} page - Page number
 * @param {string} sort - Sort field and direction
 * @returns {Object} - Paginated deactive OU data
 */
async function getDeactiveOU(howmany, page, sort) {
    try {
        // TODO: Implement database query to fetch deactive OUs
        // This is a placeholder implementation
        return {
            data: [],
            total: 0,
            page: parseInt(page),
            limit: parseInt(howmany),
            totalPages: 0
        };
    } catch (error) {
        throw new Error(`Failed to get deactive OUs: ${error.message}`);
    }
}

/**
 * Create a new OU
 * @param {string} OrgName - OU name
 * @param {string} Description - OU description
 * @param {string} parentouid - Parent OU ID (optional)
 * @param {Array} OUsettings - OU settings array
 * @param {string} Location - OU location
 * @param {Array} jsSettings - JS formatted settings array
 * @returns {Object} - Created OU data
 */
async function createOU(OrgName, Description, parentouid, OUsettings, Location, jsSettings) {
    try {
        const result = await ouModel.createOU(OrgName, Description, parentouid, OUsettings, Location, jsSettings);
        return result;

    } catch (error) {
        throw new Error(`Failed to create OU: ${error.message}`);
    }
}

/**
 * Deactivate multiple OUs
 * @param {Array<string>} deativationlist - Array of OU IDs to deactivate
 * @returns {Object} - Deactivation result
 */
async function deactiveOU(deativationlist) {
    try {
        if (!Array.isArray(deativationlist) || deativationlist.length === 0) {
            throw new Error('deativationlist must be a non-empty array');
        }

        const results = [];
        const errors = [];
        const deactivatedAt = new Date().toISOString();

        // Process each OU ID in the deactivation list
        for (const id of deativationlist) {
            try {
                // Deactivate the OU using the model
                const result = await ouModel.deactiveOU(id);
                results.push({
                    id,
                    status: 'deactivated',
                    deactivatedAt,
                    ...result
                });
            } catch (ouError) {
                errors.push({
                    id,
                    status: 'failed',
                    error: ouError.message
                });
            }
        }

        const successCount = results.length;
        const failureCount = errors.length;

        return {
            message: `Deactivation completed: ${successCount} successful, ${failureCount} failed`,
            totalRequested: deativationlist.length,
            successCount,
            failureCount,
            results,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (error) {
        throw new Error(`Failed to deactivate OUs: ${error.message}`);
    }
}

/**
 * Update an existing OU
 * @param {string} id - OU ID to update
 * @param {Object} changes - Changes object containing fields to update
 * @returns {Object} - Updated OU data
 */
async function updateOU(id, changes) {
    try {
        let processedChanges = { ...changes };

        // Handle Settings merging logic if Settings are provided
        if (changes.Settings !== undefined) {
            // Get current settings from database
            const currentOU = await ouModel.getOUById(id);
            if (!currentOU) {
                throw new Error('OU not found');
            }

            let existingSettings = {};
            try {
                existingSettings = currentOU.jsSettings || {};
                if (typeof existingSettings === 'string') {
                    existingSettings = JSON.parse(existingSettings);
                }
            } catch (parseError) {
                existingSettings = {};
            }

            // Merge the new settings with existing settings and transform to jsSettings array
            const mergedSettings = mergeSettings(existingSettings, changes.Settings);
            const jsSettingsArray = transformSettingsToJSSettings(mergedSettings);
            processedChanges.Settings = jsSettingsArray;
        }

        const result = await ouModel.updateOU(id, processedChanges);
        return {
            message: 'OU updated successfully',
            data: result
        };
    } catch (error) {
        throw new Error(`Failed to update OU: ${error.message}`);
    }
}

module.exports = {
    getOU,
    getDeactiveOU,
    createOU,
    deactiveOU,
    updateOU
};
