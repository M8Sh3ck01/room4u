const express = require('express');

const config = require('@config');
const { asyncCatch } = require('@core/middleware/asyncCatch');
const { auth } = require('@core/middleware/auth');
const { successResponse } = require('@core/utils/apiResponse');
const { appError } = require('@core/errors');
const { normalizePhone } = require('@core/utils/phone');
const { signInWithGoogle } = require('./auth.service');
const { serializeUser } = require('./user.model');

const router = express.Router();

const SESSION_TTL_MS = 60 * 60 * 1000;

const setSessionCookie = (res, token) => {
  res.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
};

const clearSessionCookie = (res) => {
  res.clearCookie(config.sessionCookieName, { path: '/' });
};

const sessionPayload = (result) => {
  const payload = { user: result.user };
  if (!config.isProduction) payload.token = result.token;
  return payload;
};

router.post(
  '/auth/google',
  asyncCatch(async (req, res) => {
    const { id_token } = req.body || {};
    if (!id_token) throw appError(400, 'VALIDATION_ERROR', 'id_token is required');
    const result = await signInWithGoogle(id_token);
    setSessionCookie(res, result.token);
    successResponse(res, sessionPayload(result), 'Signed in', 200);
  })
);

router.post('/auth/logout', (req, res) => {
  clearSessionCookie(res);
  successResponse(res, { ok: true }, 'Signed out', 200);
});

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
      const normalized = normalizePhone(phone);
      if (!normalized) {
        throw appError(400, 'VALIDATION_ERROR', 'Enter a valid Malawi phone number, e.g. 0888 123 456');
      }
      req.user.phone = normalized;
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
