import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import authRoutes from '../routes/authRoutes.js';
import patientRoutes from '../routes/patientRoutes.js';
import doctorRoutes from '../routes/doctoRoutes.js';
import emergencyRoutes from '../routes/emergencyRoutes.js';
import appointmentRoutes from '../routes/appointmentRoutes.js';
import staffRoutes from '../routes/staffRoutes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
});
app.use('/auth', limiter);

let swaggerDocument;
try {
  swaggerDocument = YAML.load('./docs/openapi.yaml');
} catch (e) {
  swaggerDocument = null;
}
if (swaggerDocument) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use('/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/staff', staffRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

