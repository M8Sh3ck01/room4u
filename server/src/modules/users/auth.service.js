const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const config = require('@config');
const { appError } = require('@core/errors');
const User = require('./user.model');
const { serializeUser } = require('./user.model');

const client = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

async function verifyGoogleIdToken(idToken) {
  if (!config.googleClientId || !client) {
    throw appError(401, 'GOOGLE_NOT_CONFIGURED', 'Google sign-in is not configured yet');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw appError(401, 'INVALID_GOOGLE_TOKEN', 'Google rejected this token');
  }

  const isGoogle = payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com';
  if (!isGoogle) {
    throw appError(401, 'INVALID_GOOGLE_TOKEN', 'Token was not issued by Google');
  }
  if (!payload.email_verified) {
    throw appError(401, 'INVALID_GOOGLE_TOKEN', 'Google email is not verified');
  }

  return payload;
}

async function getUserById(id) {
  return User.findById(id);
}

async function findOrCreateUser(payload) {
  const is_operator = config.operatorEmails.includes(payload.email);

  const user = await User.findOne({ google_sub: payload.sub });
  if (user) {
    user.is_operator = is_operator;
    if (payload.name) user.name = payload.name;
    if (payload.picture) user.avatar_url = payload.picture;
    await user.save();
    return user;
  }

  return User.create({
    google_sub: payload.sub,
    email: payload.email,
    name: payload.name || '',
    avatar_url: payload.picture || '',
    is_operator,
  });
}

const issueSessionToken = (user) =>
  jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtTtl });

async function signInWithGoogle(idToken) {
  const payload = await verifyGoogleIdToken(idToken);
  const user = await findOrCreateUser(payload);
  return { token: issueSessionToken(user), user: serializeUser(user) };
}

async function devSignIn(email, name) {
  if (config.isProduction || !config.allowDevLogin) {
    throw appError(404, 'NOT_FOUND', 'Not found');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw appError(400, 'VALIDATION_ERROR', 'A valid email is required');
  }
  const user = await findOrCreateUser({
    sub: `dev:${email}`,
    email,
    name: name || email.split('@')[0],
  });
  return { token: issueSessionToken(user), user: serializeUser(user) };
}

module.exports = {
  verifyGoogleIdToken,
  findOrCreateUser,
  getUserById,
  issueSessionToken,
  signInWithGoogle,
  devSignIn,
};
