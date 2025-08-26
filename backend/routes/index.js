const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');
const adminRoutes = require('./v1/admin.routes');
const userManagementRoutes = require('./v1/user-management.routes');
const retrieveBroadcastRoutes = require('./v1/retrieve-broadcasts.routes');
const uploadbroadcastRoutes = require('./v1/upload-broadcast.routes');
const responseBroadcastRoutes = require('./v1/response-broadcast.routes'); // Add this line

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/users', userManagementRoutes);

//Retrieve Broadcast
router.use('/v1/broadcasts', retrieveBroadcastRoutes);
//Upload Broadcast
router.use('/v1/broadcast', uploadbroadcastRoutes);
//Response Broadcast - Add this line
router.use('/v1/broadcast-responses', responseBroadcastRoutes);

module.exports = router;