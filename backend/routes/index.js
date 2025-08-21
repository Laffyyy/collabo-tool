const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');

const router = Router();

router.use('/v1/auth', authRoutes);

module.exports = router;

