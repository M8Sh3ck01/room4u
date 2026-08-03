const express = require('express');

const { asyncCatch } = require('@core/middleware/asyncCatch');
const { successResponse } = require('@core/utils/apiResponse');
const { appError } = require('@core/errors');
const { listPublicRooms, getPublicRoom } = require('./room.service');

const router = express.Router();

router.get(
  '/rooms',
  asyncCatch(async (req, res) => {
    const rooms = await listPublicRooms(req.query);
    successResponse(res, { rooms }, 'OK', 200);
  })
);

router.get(
  '/rooms/:id',
  asyncCatch(async (req, res) => {
    const room = await getPublicRoom(req.params.id);
    if (!room) throw appError(404, 'ROOM_NOT_FOUND', 'Room not found');
    successResponse(res, { room }, 'OK', 200);
  })
);

module.exports = router;
