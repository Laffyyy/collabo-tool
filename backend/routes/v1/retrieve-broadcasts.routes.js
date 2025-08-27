const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../auth/requireAuth');
const RetrieveBroadcastController = require('../../controllers/retrieve-broadcasts.controller');

// Get user's broadcasts - now uses database
router.get('/my-broadcasts', requireAuth, RetrieveBroadcastController.getMyBroadcasts);

// Stats endpoint should come BEFORE the parameterized route
router.get('/my-broadcasts/stats', requireAuth, RetrieveBroadcastController.getUserBroadcastStats);

// Get specific broadcast by ID
router.get('/my-broadcasts/:id', requireAuth, RetrieveBroadcastController.getMyBroadcastById);

// Create new broadcast
router.post('/', requireAuth, RetrieveBroadcastController.createBroadcast);

// Mark broadcast as done
router.put('/my-broadcasts/:id/mark-done', requireAuth, RetrieveBroadcastController.markBroadcastAsDone);

// Get broadcasts received by the user
router.get('/received-broadcasts', requireAuth, RetrieveBroadcastController.getReceivedBroadcasts);

module.exports = router;