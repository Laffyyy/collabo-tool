// OU Management Service
// This service handles all OU (Organizational Unit) related operations
const OUmodel = require('../model/ou.model');
const { mergeSettings } = require('../utils/settingsTransformer');
const ouModel = new OUmodel();

/**
 * Get active OUs with pagination and sorting
 * @param {number} howmany - Number of records per page
 * @param {number} page - Page number
 * @param {string} sort - Sort field and direction
 * @returns {Object} - Paginated OU data
 */
async function getOU(howmany, page, sort) {
    try {
        // TODO: Implement database query to fetch active OUs
        // This is a placeholder implementation
        return {
            data: [],
            total: 0,
            page: parseInt(page),
            limit: parseInt(howmany),
            totalPages: 0
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
 * Deactivate an OU
 * @param {string} id - OU ID to deactivate
 * @returns {Object} - Deactivation result
 */
async function deactiveOU(id) {
    try {
        // TODO: Implement database query to deactivate OU
        // This is a placeholder implementation
        return {
            message: 'OU deactivated successfully',
            data: { id, active: false, deactivatedAt: new Date().toISOString() }
        };
    } catch (error) {
        throw new Error(`Failed to deactivate OU: ${error.message}`);
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

            // Merge the new settings with existing settings
            const mergedSettings = mergeSettings(existingSettings, changes.Settings);
            processedChanges.Settings = mergedSettings;
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
