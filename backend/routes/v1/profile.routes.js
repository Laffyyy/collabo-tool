const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../auth/requireAuth');
const ProfileController = require('../../controllers/profile.controller');
const { body } = require('express-validator');

// Get current user profile
router.get('/', requireAuth, ProfileController.getUserProfile);

// Update current user profile
router.put('/', 
  requireAuth,
  [
    body('firstName').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
    body('lastName').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
    body('onlineStatus').optional().isIn(['online', 'away', 'idle', 'offline']).withMessage('Invalid online status'),
    body('profilePhoto').optional().isURL().withMessage('Profile photo must be a valid URL')
  ],
  ProfileController.updateUserProfile
);

// Get user's team structure
router.get('/team', requireAuth, ProfileController.getUserTeamStructure);

module.exports = router;