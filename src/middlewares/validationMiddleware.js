import { validationResult } from 'express-validator';

/**
 * Middleware that intercepts requests, checks if express-validator errors exist,
 * and formats them into standard JSON responses instead of proceeding to controllers.
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed, please check input data.',
      errors: errors.array(),
    });
  }
  next();
};
