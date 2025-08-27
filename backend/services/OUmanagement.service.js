// OU Management Service
// This service handles all OU (Organizational Unit) related operations
const OUmodel = require('../model/ou.model');
const ouModel = new OUmodel();

/**
 * Get active OUs with pagination and sorting
 * @param {number} howmany - Number of records per page
 * @param {number} page - Page number
 * @param {string} sort - Sort field and direction
 * @returns {Object} - Paginated OU data
 */
async function getOU(start, limit, sort, sortby, search, searchby, searchvalue, isactive) {
    try {
        // Set default values and validate parameters
        const startNum = parseInt(start) || 0;
        const limitNum = parseInt(limit) || 10;
        const sortDirection = (sort && sort.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
        const sortColumn = ['dname', 'ddescription', 'tcreatedat'].includes(sortby) ? sortby : 'dname';
        const searchColumn = ['dname', 'ddescription'].includes(searchby) ? searchby : 'dname';
        const activeStatus = isactive || 'true'; // Default to active if not specified
        
        // Get OUs and total count from model
        const [ous, totalCount] = await Promise.all([
            ouModel.getOUs(startNum, limitNum, sortDirection, sortColumn, search, searchColumn, searchvalue, activeStatus),
            ouModel.getOUCount(search, searchColumn, searchvalue, activeStatus)
        ]);

        // Format the response according to the requested structure
        const formattedOUs = ous.map(row => ({
            ouid: row.ouid,
            ouname: row.dname,
            oudescription: row.ddescription,
            membercount: parseInt(row.membercount) || 0,
            location: row.jsSettings?.Location || 'Not specified'
        }));

        // Format response based on active/inactive status
        const responseKey = activeStatus === 'true' ? 'ActiveOU' : 'InactiveOU';
        const countKey = activeStatus === 'true' ? 'allactiveou' : 'allinactiveou';

        return {
            [responseKey]: {
                [countKey]: totalCount,
                ous: formattedOUs
            }
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
 * @param {string} name - Updated OU name
 * @param {string} description - Updated OU description
 * @param {string} parentouid - Updated parent OU ID
 * @param {Array} OUsettings - Updated OU settings array
 * @returns {Object} - Updated OU data
 */
async function updateOU(id, name, description, parentouid, OUsettings) {
    try {
        // TODO: Implement database query to update OU
        // This is a placeholder implementation
        const updatedOU = {
            id,
            name,
            description,
            parentouid: parentouid || null,
            OUsettings,
            updatedAt: new Date().toISOString()
        };
        
        return {
            message: 'OU updated successfully',
            data: updatedOU
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
