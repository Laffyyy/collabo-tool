const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../auth/requireAuth');
const controller = require('../../controllers/global-settings.controller');

console.log('saveGeneralSettings:', controller.saveGeneralSettings);

router.post(
  '/general',
  requireAuth,
  controller.saveGeneralSettings // <-- THIS MUST BE A FUNCTION, NOT THE WHOLE OBJECT
);

module.exports = router;