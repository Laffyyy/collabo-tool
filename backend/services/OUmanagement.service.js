// OU Management Service
// This service handles all OU (Organizational Unit) related operations
const OUmodel = require('../model/ouManagement.model');
const { mergeSettings, transformSettingsToJSSettings, transformOUSettingsToSettings } = require('../utils/settingsTransformer');
const ouModel = new OUmodel();

// Normalize jsSettings field coming from Postgres jsonb[] which often arrives as array of strings
function deserializeJsSettings(jsSettings) {
    try {
        if (!jsSettings) return [];

        // If it is already an array of plain objects, return as is
        if (Array.isArray(jsSettings) && jsSettings.every(elem => elem && typeof elem === 'object' && !Array.isArray(elem))) {
            return jsSettings;
        }

        // If it is a string that encodes an array or object, parse it
        if (typeof jsSettings === 'string') {
            try {
                const parsed = JSON.parse(jsSettings);
                return deserializeJsSettings(parsed);
            } catch {
                return [];
            }
        }

        // If it is an array of strings, parse each and flatten any nested arrays
        if (Array.isArray(jsSettings)) {
            const out = [];
            for (const element of jsSettings) {
                if (typeof element === 'string') {
                    try {
                        const parsed = JSON.parse(element);
                        if (Array.isArray(parsed)) {
                            for (const inner of parsed) {
                                if (inner && typeof inner === 'object' && !Array.isArray(inner)) out.push(inner);
                            }
                        } else if (parsed && typeof parsed === 'object') {
                            out.push(parsed);
                        }
                    } catch {
                        // skip unparsable entries
                    }
                } else if (element && typeof element === 'object' && !Array.isArray(element)) {
                    out.push(element);
                }
            }
            return out;
        }

        return [];
    } catch {
        return [];
    }
}

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

        const { rows, total, allNodes } = await ouModel.getOUsWithTotal(
            startInt,
            limitInt,
            sort,
            sortby,
            search,
            searchby,
            searchvalue,
            isactive
        );

        // Build complete tree structure recursively
        function buildTreeStructure(nodes, parentId = null) {
            return nodes
                .filter(node => node.dparentouid === parentId)
                .map(node => ({
                    ...node,
                    children: buildTreeStructure(nodes, node.ouid)
                }));
        }

        // Recursively deserialize jsSettings for all nodes and their children
        function deserializeOUSettings(ou) {
            if (Object.prototype.hasOwnProperty.call(ou, 'jsSettings')) {
                ou.jsSettings = deserializeJsSettings(ou.jsSettings);
            }
            if (ou.children && Array.isArray(ou.children)) {
                ou.children = ou.children.map(child => deserializeOUSettings({...child}));
            }
            return ou;
        }

        // Build the complete tree for each root node
        const processedRows = rows.map(row => {
            const nodeWithTree = {
                ...row,
                children: buildTreeStructure(allNodes, row.ouid)
            };
            return deserializeOUSettings({...nodeWithTree});
        });

        const totalPages = limitInt > 0 ? Math.ceil(total / limitInt) : 0;
        const page = limitInt > 0 ? Math.floor(startInt / limitInt) + 1 : 1;

        return {
            data: processedRows,
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
        // Check if parent OU exists if parentouid is provided
        if (parentouid) {
            const parentOU = await ouModel.getOUById(parentouid);
            if (!parentOU) {
                throw new Error('Parent OU does not exist');
            }
        }

        const result = await ouModel.createOU(OrgName, Description, parentouid, OUsettings, Location, jsSettings);
        if (result && Object.prototype.hasOwnProperty.call(result, 'jsSettings')) {
            result.jsSettings = deserializeJsSettings(result.jsSettings);
        }
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
                const savedJsSettings = currentOU.jsSettings;
                if (Array.isArray(savedJsSettings)) {
                    existingSettings = transformOUSettingsToSettings(savedJsSettings);
                } else if (typeof savedJsSettings === 'string') {
                    const parsed = JSON.parse(savedJsSettings);
                    existingSettings = Array.isArray(parsed)
                        ? transformOUSettingsToSettings(parsed)
                        : (parsed || {});
                } else if (savedJsSettings && typeof savedJsSettings === 'object') {
                    // In case the driver already parsed jsonb[] to JS array
                    existingSettings = transformOUSettingsToSettings(savedJsSettings);
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
        if (result && Object.prototype.hasOwnProperty.call(result, 'jsSettings')) {
            result.jsSettings = deserializeJsSettings(result.jsSettings);
        }
        return {
            message: 'OU updated successfully',
            data: result
        };
    } catch (error) {
        throw new Error(`Failed to update OU: ${error.message}`);
    }
}

async function getOUsettings(id) {
    try {
        const result = await ouModel.getOUById(id);
        if (result && Object.prototype.hasOwnProperty.call(result, 'jsSettings')) {
            result.jsSettings = deserializeJsSettings(result.jsSettings);
        }
        return result;
    } catch (error) {
        throw new Error(`Failed to get OU settings: ${error.message}`);
    }
}


async function reactiveOU(reactivationlist) {
    try {
        if (!Array.isArray(reactivationlist) || reactivationlist.length === 0) {
            throw new Error('reactivationlist must be a non-empty array');
        }

        const results = [];
        const errors = [];
        const reactivatedAt = new Date().toISOString();

        // Process each OU ID in the deactivation list
        for (const id of reactivationlist) {
            try {
                // Reactivate the OU using the model
                const result = await ouModel.reactiveOU(id);
                results.push({
                    id,
                    status: 'reactivated',
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
            totalRequested: reactivationlist.length,
            successCount,
            failureCount,
            results,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (error) {
        throw new Error(`Failed to deactivate OUs: ${error.message}`);
    }
}

async function getChildren(parentid) {
    try {
        // Get children
        const result = await ouModel.getChildren(parentid);
        
        return result;
    } catch (error) {
        throw new Error(`Failed to get children: ${error.message}`);
    }
}

async function InsertAuditLog(did, duserid, daction, dtargettype, dtargetid, ddetails, dipaddress, duseragent, tcreatedat) {
    try {
        const result = await ouModel.InsertAuditLog(did, duserid, daction, dtargettype, dtargetid, ddetails, dipaddress, duseragent, tcreatedat);
        return result;
    } catch (error) {
        throw new Error(`Failed to insert audit log: ${error.message}`);
    }
}
module.exports = {
    getOU,
    getDeactiveOU,
    createOU,
    deactiveOU,
    updateOU,
    getOUsettings,
    reactiveOU,
    getChildren,
    InsertAuditLog
};
