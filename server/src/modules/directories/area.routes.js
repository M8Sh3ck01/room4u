const express = require('express');

const { asyncCatch } = require('@core/middleware/asyncCatch');
const { successResponse } = require('@core/utils/apiResponse');
const Area = require('./area.model');
const { serializeArea } = require('./area.model');

const router = express.Router();

router.get(
  '/areas',
  asyncCatch(async (req, res) => {
    const areas = await Area.find({}).sort({ name: 1 });
    successResponse(res, { areas: areas.map(serializeArea) }, 'OK', 200);
  })
);

module.exports = router;
