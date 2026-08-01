const config = require('@config');
const { AppError } = require('@core/errors');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL';
  let message = err.message || 'Something went wrong';
  let fields = err.fields;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid input';
    fields = Object.keys(err.errors || {});
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Duplicate value';
  } else if (err.name === 'CastError') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or expired session';
  }

  if (statusCode >= 500 && config.env !== 'test') {
    console.error(err);
  }

  res.status(statusCode).json({
    error: { code, message, ...(fields ? { fields } : {}) },
  });
};

module.exports = { errorHandler };
