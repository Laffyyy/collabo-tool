// backend/routes/v1/user.routes.js
const express = require('express');
const { requireAuth } = require('../../auth/requireAuth');
const userController = require('../../controllers/user.controller');
const router = express.Router();

router.use(requireAuth);
router.get('/', userController.getAllUsers);
router.get('/:userId/details', userController.getUserDetails);

module.exports = router;