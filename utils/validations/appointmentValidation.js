import { body, query } from 'express-validator';

export const createAppointmentValidation = [
  body('patient').isMongoId(),
  body('doctorId').isString().notEmpty(),
  body('date').isISO8601(),
  body('time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('appointmentType').isString().notEmpty(),
];

export const updateAppointmentValidation = [
  body('patient').optional().isMongoId(),
  body('doctorId').optional().isString(),
  body('date').optional().isISO8601(),
  body('time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('appointmentType').optional().isString(),
  body('status').optional().isIn(['pending', 'confirmed', 'cancelled']),
];

export const checkAvailabilityValidation = [
  body('doctorId').isString().notEmpty(),
  body('date').isISO8601(),
];
