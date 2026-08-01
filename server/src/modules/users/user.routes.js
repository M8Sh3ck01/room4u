const express = require('express');

const { asyncCatch } = require('@core/middleware/asyncCatch');
const { auth } = require('@core/middleware/auth');
const { successResponse } = require('@core/utils/apiResponse');
const { appError } = require('@core/errors');
const { signInWithGoogle, devSignIn } = require('./auth.service');
const { serializeUser } = require('./user.model');

const router = express.Router();

router.post(
  '/auth/google',
  asyncCatch(async (req, res) => {
    const { id_token } = req.body || {};
    if (!id_token) throw appError(400, 'VALIDATION_ERROR', 'id_token is required');
    const result = await signInWithGoogle(id_token);
    successResponse(res, result, 'Signed in', 200);
  })
);

router.post(
  '/auth/dev',
  asyncCatch(async (req, res) => {
    const { email, name } = req.body || {};
    const result = await devSignIn(email, name);
    successResponse(res, result, 'Signed in', 200);
  })
);

router.get(
  '/me',
  auth,
  asyncCatch(async (req, res) => {
    successResponse(res, { user: serializeUser(req.user) }, 'OK', 200);
  })
);

router.patch(
  '/me',
  auth,
  asyncCatch(async (req, res) => {
    const { phone, name } = req.body || {};

    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim().length < 9) {
        throw appError(400, 'VALIDATION_ERROR', 'Enter a valid phone number');
      }
      req.user.phone = phone.trim();
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        throw appError(400, 'VALIDATION_ERROR', 'Name cannot be empty');
      }
      req.user.name = name.trim();
    }

    await req.user.save();
    successResponse(res, { user: serializeUser(req.user) }, 'Profile updated', 200);
  })
);

module.exports = router;
