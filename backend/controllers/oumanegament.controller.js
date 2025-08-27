const oumanegamentService = require('../services/OUmanagement.service');
const { transformSettingsToOUSettings, validateSettings, transformSettingsToJSSettings } = require('../utils/settingsTransformer');

async function getOU(req, res, next) {
    try {
        const { start, limit, sort, sortby, search, searchby, searchvalue, isactive } = req.query;
        const result = await oumanegamentService.getOU(start, limit, sort, sortby, search, searchby, searchvalue, isactive);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function getDeactiveOU(req, res, next) {
    try {
        const result = await oumanegamentService.getDeactiveOU();
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function getDeactiveOUList(req, res, next) {
    try {       
        const { howmany, page, sort } = req.query;
        const result = await oumanegamentService.getDeactiveOUList(howmany, page, sort);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function createOUmanager(req, res, next) {
    try {
        // Extract fields from request body according to the new structure
        const { OrgName, Description, Location, Settings } = req.body;

        // Basic validation
        if (!OrgName || !Description || !Location || !Settings) {
            return res.status(400).json({
                ok: false,
                error: 'Missing required fields: OrgName, Description, Location, or Settings'
            });
        }

        // Validate Settings structure
        const validation = validateSettings(Settings);
        if (!validation.isValid) {
            return res.status(400).json({
                ok: false,
                error: 'Invalid Settings structure',
                details: validation.errors
            });
        }

        // Transform Settings to OUsettings array and jsSettings
        let OUsettings = [];
        let jsSettings = [];
        try {
            OUsettings = transformSettingsToOUSettings(Settings);
            jsSettings = transformSettingsToJSSettings(Settings);
        } catch (transformErr) {
            return res.status(400).json({
                ok: false,
                error: 'Failed to transform Settings: ' + transformErr.message
            });
        }

        // Call service with new structure
        let result;
        try {
            result = await oumanegamentService.createOU(
                OrgName,
                Description,
                null, // parentouid is not provided in the new structure
                OUsettings,
                Location,
                jsSettings
            );
        } catch (serviceErr) {
            return res.status(500).json({
                ok: false,
                error: 'Failed to create OU: ' + serviceErr.message
            });
        }

        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        // Catch-all error handler
        res.status(500).json({
            ok: false,
            error: 'Unexpected error: ' + err.message
        });
    }
}

async function deactiveOU(req, res, next) {
    try {
        const { id } = req.body;
        const result = await oumanegamentService.deactiveOU(id);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function updateOU(req, res, next) {
    try {
        const { id, name, description, parentouid, OUsettings } = req.body;
        const result = await oumanegamentService.updateOU(id, name, description, parentouid, OUsettings);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getOU,
    getDeactiveOU,
    getDeactiveOUList,
    createOUmanager,
    deactiveOU,
    updateOU
};
