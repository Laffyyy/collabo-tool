const { Router } = require('express');
const authRoutes = require('./v1/auth.routes');
const OUmanagerRoutes = require('./v1/oumanegament.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/OUmanager', OUmanagerRoutes);


module.exports = router;

