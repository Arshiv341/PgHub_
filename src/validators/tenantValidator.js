import { body } from 'express-validator';

export const createTenantValidator = [
  body('pgId')
    .isMongoId()
    .withMessage('Please specify a valid PG property ID'),
  body('roomId')
    .isMongoId()
    .withMessage('Please specify a valid room ID'),
  body('bedId')
    .isMongoId()
    .withMessage('Please specify a valid bed ID'),
  body('name')
    .notEmpty()
    .withMessage('Tenant name is required')
    .trim(),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid tenant email address')
    .normalizeEmail(),
  body('phone')
    .notEmpty()
    .withMessage('Tenant contact phone is required')
    .isMobilePhone()
    .withMessage('Please provide a valid contact number'),
  body('emergencyPhone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid emergency phone number'),
  body('joiningDate')
    .isISO8601()
    .withMessage('Please specify a valid joining date in ISO format'),
];
