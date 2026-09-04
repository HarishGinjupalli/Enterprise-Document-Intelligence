import config from '../config/index.js';
import logger from '../utils/logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  logger.error(err.message, {
    requestId: req.requestId,
    statusCode,
    code,
    stack: config.env !== 'production' ? err.stack : undefined,
  });

  const response = {
    success: false,
    error: {
      code,
      message: statusCode === 500 && config.env === 'production'
        ? 'Internal server error'
        : err.message,
    },
    requestId: req.requestId,
  };

  if (err.errors) {
    response.error.details = err.errors;
  }

  res.status(statusCode).json(response);
}
