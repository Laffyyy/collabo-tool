const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');
const adminRoutes = require('./v1/admin.routes');
const userManagementRoutes = require('./v1/user-management.routes');
const chatRoutes = require('./v1/chat.routes');


const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/users', userManagementRoutes);
router.use('/users', require('./v1/user.routes'));

module.exports = router;

