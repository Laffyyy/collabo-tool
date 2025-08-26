const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');
const adminRoutes = require('./v1/admin.routes');
const userManagementRoutes = require('./v1/user-management.routes');
const retrieveBroadcastRoutes = require('./v1/retrieve-broadcasts.routes');
const uploadbroadcastRoutes = require('./v1/upload-broadcast.routes');

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/users', userManagementRoutes);

//Retrieve Broadcast
router.use('/v1/broadcasts', retrieveBroadcastRoutes);
//Upload Broadcast
router.use('/v1/broadcast', uploadbroadcastRoutes);

module.exports = router;

