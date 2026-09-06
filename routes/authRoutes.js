import express from 'express';
import { login, signup } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { loginValidation } from '../utils/validations/authValidation.js';
import { signupValidation } from '../utils/validations/signupValidation.js';
const router = express.Router();

router.post('/login', loginValidation, validate, login);
router.post('/signup', signupValidation, validate, signup);

export default router;