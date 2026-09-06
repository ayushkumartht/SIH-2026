import { body } from 'express-validator';

export const loginValidation = [
  body('email').optional({ nullable: true }).isEmail(),
  body('password').optional({ nullable: true }).isString().isLength({ min: 6 }),
  body('mobile').optional({ nullable: true }).isString(),
];