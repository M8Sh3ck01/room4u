const jwt = require('jsonwebtoken');

const config = require('@config');
const { appError } = require('@core/errors');
const { getUserById } = require('@modules/users/auth.service');

const auth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = (req.cookies && req.cookies[config.sessionCookieName]) || bearer;

  if (!token) return next(appError(401, 'UNAUTHORIZED', 'Sign in required'));

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(appError(401, 'UNAUTHORIZED', 'Invalid or expired session'));
  }

  let user;
  try {
    user = await getUserById(payload.sub);
  } catch {
    return next(appError(401, 'UNAUTHORIZED', 'Invalid session'));
  }
  if (!user) return next(appError(401, 'UNAUTHORIZED', 'Account no longer exists'));

  req.user = user;
  next();
};

const requirePhone = (req, res, next) => {
  if (!req.user?.phone) return next(appError(403, 'NEEDS_PHONE', 'Add a phone number first'));
  next();
};

const requireOperator = (req, res, next) => {
  if (!req.user?.is_operator) return next(appError(403, 'FORBIDDEN', 'Operator access required'));
  next();
};

module.exports = { auth, requirePhone, requireOperator };
