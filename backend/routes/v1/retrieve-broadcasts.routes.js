const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../auth/requireAuth');
const RetrieveBroadcastController = require('../../controllers/retrieve-broadcasts.controller');
const { requireRole } = require('../../auth/requireRole');

// Get user's broadcasts - now uses database
router.get('/my-broadcasts', requireAuth, RetrieveBroadcastController.getMyBroadcasts);

// Get specific broadcast by ID
router.get('/my-broadcasts/:id', requireAuth, RetrieveBroadcastController.getMyBroadcastById);

// Get broadcast statistics
router.get('/my-broadcasts/stats', requireAuth, RetrieveBroadcastController.getMyBroadcastStats);

// Create new broadcast
router.post('/', requireAuth, RetrieveBroadcastController.createBroadcast);

// Mark broadcast as done
router.put('/my-broadcasts/:id/mark-done', requireAuth, RetrieveBroadcastController.markBroadcastAsDone);

// Get broadcasts received by the user
router.get('/received-broadcasts', requireAuth, RetrieveBroadcastController.getReceivedBroadcasts);

// Get all broadcasts (admin only)
router.get('/all', requireAuth, requireRole('admin'), RetrieveBroadcastController.getAllBroadcasts);

module.exports = router;