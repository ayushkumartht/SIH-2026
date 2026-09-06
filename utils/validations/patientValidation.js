import { body } from 'express-validator';

export const createPatientValidation = [
  body('name').isString().notEmpty(),
  body('age').isInt({ min: 0 }),
  body('gender').isIn(['male','female','other']),
  body('contact').isString().notEmpty(),
];

export const updatePatientValidation = [
  body('age').optional().isInt({ min: 0 }),
  body('gender').optional().isIn(['male','female','other']),
];


