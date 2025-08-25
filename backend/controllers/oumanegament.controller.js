const oumanegamentService = require('../services/OUmanagement.service');

async function getOU(req, res, next) {
    try {
        const { howmany, page, sort } = req.query;
        const result = await oumanegamentService.getOU(howmany, page, sort);
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

        // Prepare OUsettings array based on Settings object
        let OUsettings = [];
        console.log('Settings received:', JSON.stringify(Settings, null, 2));
        try {
            if (Settings && Settings.Chat) {
                const chat = Settings.Chat;
                if (chat.Frontline) {
                    OUsettings.push({
                        settingstype: 'chat.frontline',
                        init1v1: !!chat.Frontline.Init1v1,
                        createGroup: !!chat.Frontline.CreateGroup,
                        joinGroupChats: !!chat.Frontline.JoinGroupChats,
                        shareFiles: !!chat.Frontline.ShareFiles,
                        forwardMessage: !!chat.Frontline.ForwardMessage
                    });
                }
                if (chat.support) {
                    OUsettings.push({
                        settingstype: 'chat.support',
                        init1v1: !!chat.support.Init1v1,
                        createGroup: !!chat.support.CreateGroup,
                        joinGroupChats: !!chat.support.JoinGroupChats,
                        shareFiles: !!chat.support.ShareFiles,
                        forwardMessage: !!chat.support.ForwardMessage
                    });
                }
                if (chat.supervisor) {
                    OUsettings.push({
                        settingstype: 'chat.supervisor',
                        createGroup: !!chat.supervisor.CreateGroup,
                        shareFiles: !!chat.supervisor.ShareFiles,
                        forwardMessage: !!chat.supervisor.ForwardMessage
                    });
                }
            }

            if (Settings && Settings.broadcast) {
                const broadcast = Settings.broadcast;
                if (broadcast.Frontline) {
                    OUsettings.push({
                        settingstype: 'broadcast.frontline',
                        createBroadcasts: !!broadcast.Frontline.CreateBroadcasts,
                        replyToBroadcasts: !!broadcast.Frontline.ReplyToBroadcasts
                    });
                }
                if (broadcast.support) {
                    OUsettings.push({
                        settingstype: 'broadcast.support',
                        createBroadcasts: !!broadcast.support.CreateBroadcasts,
                        replyToBroadcasts: !!broadcast.support.ReplyToBroadcasts
                    });
                }
                if (broadcast.supervisor) {
                    OUsettings.push({
                        settingstype: 'broadcast.supervisor',
                        createBroadcasts: !!broadcast.supervisor.CreateBroadcasts
                    });
                }
            }
        } catch (parseErr) {
            return res.status(400).json({
                ok: false,
                error: 'Invalid Settings structure: ' + parseErr.message
            });
        }

        console.log('Final OUsettings array:', JSON.stringify(OUsettings, null, 2));

        // Call service with new structure
        let result;
        try {
            result = await oumanegamentService.createOU(
                OrgName,
                Description,
                null, // parentouid is not provided in the new structure
                OUsettings,
                Location
            );
            console.log('result', result);
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
