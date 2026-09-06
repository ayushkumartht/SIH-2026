import { body } from 'express-validator';

export const createStaffValidation = [
  body('name').isString().notEmpty(),
  body('email').isEmail(),
  body('password').isString().isLength({ min: 6 }),
  body('role').isIn(['admin', 'receptionist', 'doctor', 'lab']),
];

export const updateStaffValidation = [
  body('email').optional().isEmail(),
  body('password').optional().isString().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'receptionist', 'doctor', 'lab']),
];