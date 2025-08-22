const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');
const chatRoutes = require('./v1/chat.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);

module.exports = router;

