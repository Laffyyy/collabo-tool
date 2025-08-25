const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../auth/requireAuth');
const RetrieveBroadcastController = require('../../controllers/retrieve-broadcasts.controller');

// Get user's broadcasts - now uses database
router.get('/my-broadcasts', requireAuth, RetrieveBroadcastController.getMyBroadcasts);

// Get specific broadcast by ID
router.get('/my-broadcasts/:id', requireAuth, RetrieveBroadcastController.getMyBroadcastById);

// Get broadcast statistics
router.get('/my-broadcasts/stats', requireAuth, RetrieveBroadcastController.getMyBroadcastStats);

// Create new broadcast
router.post('/', requireAuth, RetrieveBroadcastController.createBroadcast);

module.exports = router;