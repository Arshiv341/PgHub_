import { body } from 'express-validator';

export const recordPaymentValidator = [
  body('paymentMode')
    .isIn(['Cash', 'UPI', 'Card', 'NetBanking'])
    .withMessage('Payment mode must be Cash, UPI, Card, or NetBanking'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Payment date must be in ISO format'),
];
