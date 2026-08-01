class AppError extends Error {
  constructor(statusCode, code, message, fields) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

const appError = (statusCode, code, message, fields) =>
  new AppError(statusCode, code, message, fields);

module.exports = { AppError, appError };
