const { Router } = require('express');
const OUmanagerController = require('../../controllers/oumanegament.controller');
const { validate } = require('../../utils/validate');
const { body } = require('express-validator');

const router = Router();

router.get(
    '/active',
    [
    ],
    validate,
    OUmanagerController.getOU
)

router.get(
    '/active/list',
    [
        body('range').isString().notEmpty(),
    ],
    validate,
    OUmanagerController.getOU
)

router.get(
    '/deactive',
    [],
    validate,
    OUmanagerController.getDeactiveOU
)

router.get(
    '/deactive/list',
    [

    ],
    validate,
    OUmanagerController.getDeactiveOU
)

router.post(
    '/create',
    [
    body('OrgName').isString().notEmpty(),
    body('Description').isString().notEmpty(),
    body('Location').isString().notEmpty(),
    body('Settings').isObject().notEmpty(),
    // Chat settings validation (optional - only validate if present)
    body('Settings.Chat.Frontline.Init1v1').optional().isBoolean(),
    body('Settings.Chat.Frontline.CreateGroup').optional().isBoolean(),
    body('Settings.Chat.Frontline.JoinGroupChats').optional().isBoolean(),
    body('Settings.Chat.Frontline.ShareFiles').optional().isBoolean(),
    body('Settings.Chat.Frontline.ForwardMessage').optional().isBoolean(),
    body('Settings.Chat.support.Init1v1').optional().isBoolean(),
    body('Settings.Chat.support.CreateGroup').optional().isBoolean(),
    body('Settings.Chat.support.JoinGroupChats').optional().isBoolean(),
    body('Settings.Chat.support.ShareFiles').optional().isBoolean(),
    body('Settings.Chat.support.ForwardMessage').optional().isBoolean(),
    body('Settings.Chat.supervisor.CreateGroup').optional().isBoolean(),
    body('Settings.Chat.supervisor.ShareFiles').optional().isBoolean(),
    body('Settings.Chat.supervisor.ForwardMessage').optional().isBoolean(),
    // Broadcast settings validation (optional - only validate if present)
    body('Settings.broadcast.Frontline.CreateBroadcasts').optional().isBoolean(),
    body('Settings.broadcast.Frontline.ReplyToBroadcasts').optional().isBoolean(),
    body('Settings.broadcast.support.CreateBroadcasts').optional().isBoolean(),
    body('Settings.broadcast.support.ReplyToBroadcasts').optional().isBoolean(),
    body('Settings.broadcast.supervisor.CreateBroadcasts').optional().isBoolean(),
    ],
    validate,
    OUmanagerController.createOUmanager
)

router.post(
    '/deactive',
    [body('id').isString().notEmpty()],
    validate,
    OUmanagerController.deactiveOU
)

router.post(
    '/update',
    [body('id').isString().notEmpty(),
    body('name').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('parentouid').isString(),
    body('OUSettings').isArray().notEmpty(),
    body('OUSettings.*.Settingstype').isString().notEmpty(),
],
    validate,
    OUmanagerController.updateOU
)

module.exports = router;