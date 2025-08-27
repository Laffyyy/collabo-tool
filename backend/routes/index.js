const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');
const adminRoutes = require('./v1/admin.routes');
const userManagementRoutes = require('./v1/user-management.routes');
const devRoutes = require('./v1/dev.routes');

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/users', userManagementRoutes);

// Development routes (no auth required)
if (process.env.NODE_ENV !== 'production') {
  router.use('/v1/dev', devRoutes);
}

module.exports = router;

