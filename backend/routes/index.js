const { Router } = require('express');
// const authRoutes = require('./v1/auth.routes'); // Disabled for testing
const auditLogRoutes = require('./v1/auditlog.routes');

const router = Router();

// router.use('/auth', authRoutes); // Disabled for testing
router.use('/auditlogs', auditLogRoutes);

module.exports = router;

