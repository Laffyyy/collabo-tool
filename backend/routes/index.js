const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');

const router = Router();

router.use('/auth', authRoutes);

module.exports = router;

