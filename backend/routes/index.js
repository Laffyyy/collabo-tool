const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');
const adminRoutes = require('./v1/admin.routes');
const userManagementRoutes = require('./v1/user-management.routes');
const devRoutes = require('./v1/dev.routes');
const retrieveBroadcastRoutes = require('./v1/retrieve-broadcasts.routes');
const uploadbroadcastRoutes = require('./v1/upload-broadcast.routes');
const responseBroadcastRoutes = require('./v1/response-broadcast.routes'); 
const broadcastManagementRoutes = require('./v1/broadcast-management.routes'); 
const globalSettingsRoutes = require('./v1/global-settings.routes');
const profileRoutes = require('./v1/profile.routes');
const chatRoutes = require('./v1/chat.routes');
const userStatusRoutes = require('./v1/user-status.routes');
const userRoutes = require('./v1/user.routes');


const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/users', userManagementRoutes);

// Development routes (no auth required)
if (process.env.NODE_ENV !== 'production') {
  router.use('/v1/dev', devRoutes);
}

//Retrieve Broadcast
router.use('/v1/broadcasts', retrieveBroadcastRoutes);
//Upload Broadcast
router.use('/v1/broadcast', uploadbroadcastRoutes);
//Response Broadcast - Add this line
router.use('/v1/broadcast-responses', responseBroadcastRoutes);
// Admin broadcast management - use different path
router.use('/v1/admin/broadcasts', broadcastManagementRoutes);
//Admin global settings
router.use('/v1/global-settings', globalSettingsRoutes);
//Profile
router.use('/v1/profile', profileRoutes);
//User Status
router.use('/v1/user-status', userStatusRoutes);
//router.use('/users', require('./v1/user.routes'));
router.use('/users', userRoutes);

module.exports = router;