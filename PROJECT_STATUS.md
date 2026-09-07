# SIH-2026 Project Status

## Project Overview

This project is a rural healthcare and telemedicine platform for connecting patients, doctors, laboratory staff, hospital staff, and administrators. The backend is built with Node.js, Express, MongoDB, Mongoose, JWT authentication, and Socket.IO.

## Completed Work

### Backend foundation

- Express server configured in `index.js`.
- Environment variables loaded with `dotenv`.
- CORS and JSON request parsing enabled.
- MongoDB connection configured through Mongoose.
- Demo mode available with `DEMO_MODE=true`, allowing teleconsultation testing without MongoDB.
- Health-check endpoint available at `GET /api/health`.
- Basic root endpoint available at `GET /`.
- Central logging and error-handling utilities are present.

### Authentication and user roles

- Authentication routes and controller are present.
- JWT-based authentication middleware is present.
- Role-specific middleware exists for doctors and laboratory doctors.
- Validation utilities exist for authentication, signup, doctors, patients, staff, appointments, and emergencies.

### Healthcare modules

- Patient management.
- Doctor management.
- Staff management.
- Laboratory doctor management.
- Appointment management.
- Emergency request management.
- Offline request management.
- Reports and laboratory report models.
- Doctor calendar, slot-lock, and emergency models used by the current API.

### Teleconsultation

- Socket.IO is attached to the HTTP server.
- Authenticated Socket.IO connections are supported.
- Call-room creation and storage are implemented.
- Raw WebRTC signaling supports offers, answers, and ICE candidates.
- Users can join and leave call rooms.
- Doctor and patient participation is checked before joining a call.
- Daily.co room integration paths are present.
- Network quality is calculated centrally from RTT and packet-loss metrics.
- Quality tiers are supported: HD, low resolution, audio only, very poor, and unknown.
- Quality history and current quality are stored for calls.
- Consultation vitals can be stored against a call.
- Calls can be ended with status and timestamps.
- Socket.IO quality updates and call-ended events are supported.

### React frontend

- React + Vite frontend is available in `frontend/`.
- React routes provide the project home, documentation, patient dashboard, and doctor dashboard.
- Patient signup/login, doctor discovery, appointment booking, and consultation history are available.
- Doctor login, queue, patient context, consultation history, and assessment workspace are available.
- Existing backend teleconsultation APIs remain the integration layer for rooms, vitals, quality, and consultation updates.

## How To Run The Current Demo

Install dependencies:

```powershell
npm install
```

Start the backend in demo mode:

```powershell
npm run demo
```

Start the React frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in a browser. Use `/patient`, `/doctor`, or `/docs`. Demo credentials are shown on the login screens.

## Current Limitations And Remaining Work

- The production frontend dashboards described in the functional specification are not complete; the current frontend is primarily a standalone test console.
- Full production integration with Daily.co credentials and configuration still needs verification.
- Offline synchronization and SMS/IVR fallback workflows need production implementation and testing.
- Prescription, assessment, queue, and complete consultation-history workflows need to be connected end to end.
- Automated tests are not configured yet; `npm test` currently exits with a placeholder error.
- Production security review is still required for secrets, CORS, rate limits, authorization, audit logging, and patient-data handling.
- Deployment configuration, monitoring, backups, and production environment documentation remain to be completed.

## Important Project Documents

- `PRODUCTION_FRONTEND_IMPLEMENTATION_PLAN.md` describes the phased frontend integration, route map, component map, API contracts, and acceptance criteria.
- `TASK_TELECONSULTATION.md` describes the teleconsultation implementation status and test flow.
- `TELECONSULTATION_DASHBOARD_FUNCTIONAL_SPEC.md` describes planned dashboard behavior and user workflows.
- `TELECONSULTATION_PLATFORM_ARCHITECTURE.md` describes the platform architecture.