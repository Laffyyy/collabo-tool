const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');
const adminRoutes = require('./v1/admin.routes');
const userManagementRoutes = require('./v1/user-management.routes');
const broadcastRoutes = require('./v1/upload-broadcast.routes');

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/users', userManagementRoutes);
router.use('/v1/broadcast', broadcastRoutes);

module.exports = router;

