const express = require('express');
const { requireAuth } = require('../../auth/requireAuth');
const UserStatusController = require('../../controllers/user-status.controller');

const router = express.Router();

// Apply requireAuth to all routes
router.use(requireAuth);

// Update user status
router.put('/status', UserStatusController.updateStatus);

// Get current user status
router.get('/status', UserStatusController.getStatus);

// Get all users with status
router.get('/users/status', UserStatusController.getAllUsersWithStatus);

// Get user by username
router.get('/users/:username', UserStatusController.getUserByUsername);

// Heartbeat endpoint
router.post('/heartbeat', UserStatusController.heartbeat);

// Set specific status
router.post('/online', UserStatusController.setOnline);
router.post('/offline', UserStatusController.setOffline);

module.exports = router;