const { Router } = require('express');
const OUmanagerController = require('../../controllers/oumanegament.controller');
const { validate } = require('../../utils/validate');

const router = Router();

router.get(
    '/',
    [body('howmany').isInt().notEmpty(),
    body('page').isInt().notEmpty(),
    body('sort').isString().notEmpty(),
    ],
    validate,
    OUmanagerController.getOU
)

router.get(
    '/deactive',
    [body('howmany').isInt().notEmpty(),
    body('page').isInt().notEmpty(),
    body('sort').isString().notEmpty(),
    ],
    validate,
    OUmanagerController.getDeactiveOU
)

router.post(
    '/create',
    [,
    body('name').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('parentouid').isString(),
    body('OUsettings').isArray().notEmpty(),
    body('OUsettings.*.settingstype').isString().notEmpty(),

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
    body('OUsettings').isArray().notEmpty(),
    body('OUsettings.*.settingstype').isString().notEmpty(),
],
    validate,
    OUmanagerController.updateOU
)

module.exports = router;