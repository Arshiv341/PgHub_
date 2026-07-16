/**
 * Global Express Error Handler.
 * Intercepts uncaught throw events and returns standardized JSON messages.
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Server Error Log:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Custom formatting for common MongoDB or Auth anomalies
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Resource not found. Invalid ID: ${err.value}` });
  }

  if (err.code === 11000) {
    return res.status(400).json({ message: 'Duplicate field value entered in database' });
  }

  if (err.name === 'ValidationError') {
    const errorDetails = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({ message: 'Database validation failed', errors: errorDetails });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid session token. Please sign in again.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }

  res.status(status).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
