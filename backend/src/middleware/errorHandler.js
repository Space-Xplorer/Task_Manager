import { env } from '../config/env.js';

// Central error handler — must be registered LAST in Express
// Controllers call next(error) to reach this.
export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] ?? 'field';
    return res.status(409).json({
      error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      code: 'DUPLICATE_KEY',
    });
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message, code: err.code ?? 'ERROR' });
  }

  // Default 500 — never expose stack in production
  res.status(500).json({
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
};

// Helper — create a typed HTTP error and throw it in controllers
export const createError = (status, message, code) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};
