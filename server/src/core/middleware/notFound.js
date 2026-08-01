const { appError } = require('@core/errors');

const notFound = (req, res, next) =>
  next(appError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));

module.exports = { notFound };
