import { body } from 'express-validator';

export const createDoctorValidation = [
  body('name').isString().notEmpty(),
  body('department').isString().notEmpty(),
  body('status').optional().isIn(['Available','Busy','Not Available']),
];

export const updateDoctorValidation = [
  body('status').optional().isIn(['Available','Busy','Not Available']),
];


