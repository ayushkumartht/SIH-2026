import { body } from 'express-validator';

export const createEmergencyValidation = [
  body('patientId').optional({ nullable: true }).isMongoId(),
  body('emergencyType').isIn(['medical', 'trauma', 'accident', 'pregnancy', 'fire', 'other']),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('title').optional({ nullable: true }).isString(),
  body('details').optional({ nullable: true }).isString(),
];

export const assignEmergencyValidation = [
  body('doctorId').isMongoId(),
];

export const assignVehicleValidation = [
  body('vehicleId').isMongoId(),
];

export const updateDispatchStatusValidation = [
  body('status').isIn([
    'searching_ambulance',
    'vehicle_assigned',
    'dispatched',
    'en_route',
    'arrived',
    'at_hospital',
    'handed_over',
    'cancelled',
    'closed',
  ]),
  body('hospitalId').optional({ nullable: true }).isMongoId(),
];
