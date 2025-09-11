const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');
const adminRoutes = require('./v1/admin.routes');
const userManagementRoutes = require('./v1/user-management.routes');
const devRoutes = require('./v1/dev.routes');
const chatRoutes = require('./v1/chat.routes');
const adminChatRoutes = require('./v1/admin-chat.routes');
const userRoutes = require('./v1/user.routes');


const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/chat', chatRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/admin/chat', adminChatRoutes);
router.use('/v1/users', userManagementRoutes);

// Development routes (no auth required)
if (process.env.NODE_ENV !== 'production') {
  router.use('/v1/dev', devRoutes);
}
router.use('/users', userRoutes);

module.exports = router;

