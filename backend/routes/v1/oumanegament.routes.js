const { Router } = require('express');
const OUmanagerController = require('../../controllers/oumanegament.controller');
const { validate } = require('../../utils/validate');
const { body, query } = require('express-validator');
const { requireAuth } = require('../../auth/requireAuth');
const { requireRole } = require('../../auth/requireRole');
const { auditLogger, auditHelpers } = require('../../middleware/auditLogger');

const router = Router();


router.get(
    '/list',
    requireAuth,
    requireRole('admin'),
    [
        query('start').optional().isInt({ min: 0 }).withMessage('start must be a non-negative integer'),
        query('isactive').optional().isIn(['true', 'false']).withMessage('isactive must be true or false'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be an integer between 1 and 100'),
        query('sort').optional().isIn(['ASC', 'DESC']).withMessage('sort must be ASC or DESC'),
        query('sortby').optional().isIn(['dname', 'ddescription', 'tcreatedat']).withMessage('sortby must be one of: dname, ddescription, tcreatedat'),
        query('search').optional().isIn(['true', 'false']).withMessage('search must be true or false'),
        query('searchby').optional().isIn(['dname', 'ddescription']).withMessage('searchby must be one of: dname, ddescription'),
        query('searchvalue').optional().isString().withMessage('searchvalue must be a string'),
    ],
    validate,
    auditLogger('RETRIEVE_OUS', 'OU', null, auditHelpers.getRetrieveOUDetails),
    OUmanagerController.getOU
)

router.get(
    '/getchildren',
    requireAuth,
    requireRole('admin'),
    [query('parentid').isString().notEmpty().withMessage('parentid must be a non-empty string')
        .isUUID().withMessage('parentid must be a valid UUID')],
    validate,
    auditLogger('RETRIEVE_CHILDREN', 'OU', auditHelpers.getChildrenTargetId, auditHelpers.getChildrenDetails),
    OUmanagerController.getChildren
)


router.post(
    '/create',
    requireAuth,
    requireRole('admin'),
    [
    body('OrgName').isString().notEmpty(),
    body('Description').isString().notEmpty(),
    body('Location').isString().notEmpty(),
    body('ParentId').optional().isString().notEmpty(),
    body('Settings').isObject().notEmpty(),
    body('Settings.Chat').isObject().notEmpty(),
    body('Settings.broadcast').isObject().notEmpty(),

    //both is needed for the validation
    body('Settings.Chat.Frontline.Init1v1').isBoolean(),
    body('Settings.Chat.Frontline.CreateGroup').isBoolean(),
    body('Settings.Chat.Frontline.JoinGroupChats').isBoolean(),
    body('Settings.Chat.Frontline.ShareFiles').isBoolean(),
    body('Settings.Chat.Frontline.ForwardMessage').isBoolean(),
    body('Settings.Chat.support.Init1v1').isBoolean(),
    body('Settings.Chat.support.CreateGroup').isBoolean(),
    body('Settings.Chat.support.JoinGroupChats').isBoolean(),
    body('Settings.Chat.support.ShareFiles').isBoolean(),
    body('Settings.Chat.support.ForwardMessage').isBoolean(),
    body('Settings.Chat.supervisor.CreateGroup').isBoolean(),
    body('Settings.Chat.supervisor.ShareFiles').isBoolean(),
    body('Settings.Chat.supervisor.ForwardMessage').isBoolean(),

    body('Settings.Chat.General.FileSharing').isBoolean(),
    body('Settings.Chat.General.Emoji').isBoolean(),
    body('Settings.Chat.General.Retention').isInt(),
    
    body('Settings.broadcast.frontline.createBroadcasts').isBoolean(),
    body('Settings.broadcast.frontline.replyToBroadcasts').isBoolean(),
    body('Settings.broadcast.support.createBroadcasts').isBoolean(),
    body('Settings.broadcast.support.replyToBroadcasts').isBoolean(),
    body('Settings.broadcast.supervisor.createBroadcasts').isBoolean(),

    body('Settings.broadcast.general.approvalforBroadcast').isBoolean(),
    body('Settings.broadcast.general.scheduleBroadcast').isBoolean(),
    body('Settings.broadcast.general.priorityBroadcast').isBoolean(),
    body('Settings.broadcast.general.retention').isInt(),
    ],
    validate,
    auditLogger('CREATE_OU', 'OU', auditHelpers.getCreateOUTargetId, auditHelpers.getCreateOUDetails),
    OUmanagerController.createOUmanager
)



router.post(
    '/update',
    requireAuth,
    requireRole('admin'),
    [body('id').isString().notEmpty(),
    body('changes').isObject().notEmpty(),
    body('changes.OrgName').optional().isString().notEmpty(),
    body('changes.Description').optional().isString().notEmpty(),
    body('changes.Location').optional().isString().notEmpty(),
    body('changes.isactive').optional().isBoolean(),
    body('changes.Settings').optional().isObject().notEmpty(),
    // Chat Settings - Only validate if Chat object exists
    body('changes.Settings.Chat').optional().isObject(),
    body('changes.Settings.Chat.Frontline').optional().isObject(),
    body('changes.Settings.Chat.Frontline.Init1v1').optional().isBoolean(),
    body('changes.Settings.Chat.Frontline.CreateGroup').optional().isBoolean(),
    body('changes.Settings.Chat.Frontline.JoinGroupChats').optional().isBoolean(),
    body('changes.Settings.Chat.Frontline.ShareFiles').optional().isBoolean(),
    body('changes.Settings.Chat.Frontline.ForwardMessage').optional().isBoolean(),
    body('changes.Settings.Chat.support').optional().isObject(),
    body('changes.Settings.Chat.support.Init1v1').optional().isBoolean(),
    body('changes.Settings.Chat.support.CreateGroup').optional().isBoolean(),
    body('changes.Settings.Chat.support.JoinGroupChats').optional().isBoolean(),
    body('changes.Settings.Chat.support.ShareFiles').optional().isBoolean(),
    body('changes.Settings.Chat.support.ForwardMessage').optional().isBoolean(),
    body('changes.Settings.Chat.supervisor').optional().isObject(),
    body('changes.Settings.Chat.supervisor.CreateGroup').optional().isBoolean(),
    body('changes.Settings.Chat.supervisor.ShareFiles').optional().isBoolean(),
    body('changes.Settings.Chat.supervisor.ForwardMessage').optional().isBoolean(),
    body('changes.Settings.Chat.General').optional().isObject(),
    body('changes.Settings.Chat.General.FileSharing').optional().isBoolean(),
    body('changes.Settings.Chat.General.Emoji').optional().isBoolean(),
    body('changes.Settings.Chat.General.Retention').optional().isInt(),
    // Broadcast Settings - Only validate if broadcast object exists
    body('changes.Settings.broadcast').optional().isObject(),
    body('changes.Settings.broadcast.frontline').optional().isObject(),
    body('changes.Settings.broadcast.frontline.createBroadcasts').optional().isBoolean(),
    body('changes.Settings.broadcast.frontline.replyToBroadcasts').optional().isBoolean(),
    body('changes.Settings.broadcast.support').optional().isObject(),
    body('changes.Settings.broadcast.support.createBroadcasts').optional().isBoolean(),
    body('changes.Settings.broadcast.support.replyToBroadcasts').optional().isBoolean(),
    body('changes.Settings.broadcast.supervisor').optional().isObject(),
    body('changes.Settings.broadcast.supervisor.createBroadcasts').optional().isBoolean(),
    body('changes.Settings.broadcast.general').optional().isObject(),
    body('changes.Settings.broadcast.general.approvalforBroadcast').optional().isBoolean(),
    body('changes.Settings.broadcast.general.scheduleBroadcast').optional().isBoolean(),
    body('changes.Settings.broadcast.general.priorityBroadcast').optional().isBoolean(),
    body('changes.Settings.broadcast.general.retention').optional().isInt(),
],
    validate,
    auditLogger('UPDATE_OU', 'OU', auditHelpers.getUpdateOUTargetId, auditHelpers.getUpdateOUDetails),
    OUmanagerController.updateOU
)

router.get(
    '/getOUsettings',
    requireAuth,
    requireRole('admin'),
    [query('id').isString().notEmpty()],
    validate,
    auditLogger('RETRIEVE_OU_SETTINGS', 'OU', auditHelpers.getOUSettingsTargetId, auditHelpers.getOUSettingsDetails),
    OUmanagerController.getOUsettings
)

router.post(
    '/deactive',
    requireAuth,
    requireRole('admin'),
    [
        body('deativationlist').isArray().notEmpty().withMessage('deativationlist must be a non-empty array'),
        body('deativationlist.*').isString().notEmpty().withMessage('Each OU ID must be a non-empty string')
            .isUUID().withMessage('Each OU ID must be a valid UUID'),
    ],
    validate,
    auditLogger('DEACTIVATE_OU', 'OU', auditHelpers.getDeactivateOUTargetId, auditHelpers.getDeactivateOUDetails),
    OUmanagerController.deactiveOU
)

router.post(
    '/reactive',
    requireAuth,
    requireRole('admin'),
    [body('reactivationlist').isArray().notEmpty().withMessage('reactivationlist must be a non-empty array'),
    body('reactivationlist.*').isString().notEmpty().withMessage('Each OU ID must be a non-empty string')
        .isUUID().withMessage('Each OU ID must be a valid UUID'),
        
    ],
    validate,
    auditLogger('REACTIVATE_OU', 'OU', auditHelpers.getReactivateOUTargetId, auditHelpers.getReactivateOUDetails),
    OUmanagerController.reactiveOU
)



module.exports = router;