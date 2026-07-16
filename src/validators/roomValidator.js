import { body } from 'express-validator';

export const createRoomValidator = [
  body('pgId')
    .isMongoId()
    .withMessage('Please specify a valid PG property ID'),
  body('roomNumber')
    .notEmpty()
    .withMessage('Room number/name is required')
    .trim(),
  body('sharingType')
    .isInt({ min: 1 })
    .withMessage('Sharing capacity must be an integer of 1 or more'),
  body('rentPerBed')
    .isFloat({ min: 0 })
    .withMessage('Rent rate per bed must be a positive number'),
];
