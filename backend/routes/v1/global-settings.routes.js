const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../auth/requireAuth');
const controller = require('../../controllers/global-settings.controller');

// GET endpoint to fetch current settings
router.get(
  '/general',
  requireAuth,
  controller.getGeneralSettings
);

// POST endpoint to save settings
router.post(
  '/general',
  requireAuth,
  controller.saveGeneralSettings
);

module.exports = router;