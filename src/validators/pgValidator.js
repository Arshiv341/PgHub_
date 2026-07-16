import { body } from 'express-validator';

export const createPgValidator = [
  body('name')
    .notEmpty()
    .withMessage('Property name is required')
    .trim(),
  body('address')
    .notEmpty()
    .withMessage('Property address is required')
    .trim(),
  body('city')
    .notEmpty()
    .withMessage('Property city is required')
    .trim(),
  body('type')
    .isIn(['Boys', 'Girls', 'Unisex'])
    .withMessage('Property type must be Boys, Girls, or Unisex'),
  body('amenities')
    .optional()
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        return value.split(',').map(item => item.trim());
      }
      return value;
    }),
];
