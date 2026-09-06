import { body } from 'express-validator';

export const createEmergencyValidation = [
  body('patient').isMongoId(),
  body('issue').isString().notEmpty(),
  body('severity').isIn(['High','Medium','Low']),
];

export const assignEmergencyValidation = [
  body('doctorId').isMongoId(),
];


