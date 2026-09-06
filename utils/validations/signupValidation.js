import { body } from 'express-validator';

export const signupValidation = [
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Valid email is required for staff'),
  body('password').optional({ nullable: true }).isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('mobile').optional({ nullable: true }).isString().withMessage('Mobile is required for doctors and lab doctors'),
  body('role').isIn(['admin', 'receptionist', 'doctor', 'lab']).withMessage('Role must be either admin, receptionist, doctor, or lab'),
  body('specialization').optional({ nullable: true }).isString().withMessage('Specialization must be a string')
];