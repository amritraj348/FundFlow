const config = require('../config/env');

// Must stay last in the middleware chain (4-arg signature is what tells
// Express this is an error handler, not a regular route).
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for field: ${field}`;
  }

  // Multer upload errors (file too large, unexpected field, etc.)
  if (err.name === 'MulterError') {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: config.env === 'production' ? undefined : err.stack,
  });
}

module.exports = errorHandler;
