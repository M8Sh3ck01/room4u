const express = require('express');
const areaRoutes = require('./area.routes');

const router = express.Router();

router.use(areaRoutes);

module.exports = router;
