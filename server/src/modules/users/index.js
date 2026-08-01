const express = require('express');
const userRoutes = require('./user.routes');

const router = express.Router();

router.use(userRoutes);

module.exports = router;
