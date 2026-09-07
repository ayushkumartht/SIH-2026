# Nabha Care — Application Working Guide

## Purpose

Nabha Care is a rural telemedicine platform. It connects patients and ASHA workers with doctors, while health facilities can support referral and follow-up. Its central design goal is to keep care available when network quality is weak.

## What works now

| Area | Current capability |
| --- | --- |
| Access | Patient sign-up/login and doctor login using JWT-based authentication |
| Patient portal | Find doctors, book appointments, see appointments and consultation history |
| Doctor portal | See queue/history and save assessment, advice, prescription and outcome |
| Live calls | Socket.IO call rooms and raw WebRTC offer/answer/ICE signaling |
| Network adaptation | RTT and packet loss are classified into HD, low-resolution, audio-only, very-poor, or unknown quality tiers |
| Clinical data | Consultations, appointments, patients, doctors, lab reports, emergency and offline-request models/routes |
| Demo | `DEMO_MODE=true` runs teleconsultation paths without MongoDB |

## User journey

```text
Patient or ASHA worker
  → identify patient and obtain consent
  → select doctor and book a time
  → join waiting room
  → network quality check
  → video / low-resolution / audio / offline route
  → doctor assessment
  → advice, prescription and follow-up history
```

## Architecture

```text
React + Vite frontend
  ├─ Landing page, patient portal, doctor portal, documentation
  └─ REST API calls with JWT bearer token
            │
Express + Node.js API
  ├─ Controllers and routes for auth, patients, doctors, staff, appointments,
  │  emergencies, labs, offline requests and portal dashboards
  ├─ Socket.IO for authenticated live-call signaling and quality updates
  └─ Validation, role middleware, logging and error handling
            │
MongoDB + Mongoose (production)
  └─ Patient, Doctor, Appointment, Consultation, CallRoom, Report and related records
```

### Live consultation sequence

1. An authorized patient and doctor obtain/join a call room.
2. Their clients connect to Socket.IO using the teleconsultation authentication middleware.
3. Socket.IO relays WebRTC `offer`, `answer`, and `ice-candidate` messages. Media travels peer-to-peer when the environment permits.
4. Each client may submit RTT and packet-loss values through `quality:update`.
5. The backend calculates a quality tier, stores its history with the call room, and emits `quality:changed` to both participants.
6. The doctor saves clinical results through the consultation APIs; consultation content is kept distinct from connection-quality history.

## How to run locally

Prerequisite: Node.js 18 or newer.

```powershell
# Terminal 1 — from the repository root
npm install
npm run demo

# Terminal 2
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in terminal (normally `http://localhost:5173`). The frontend calls `http://localhost:3000` by default. Set `VITE_API_URL` if the API runs at a different address.

Demo credentials:

```text
Patient: patient@demo.local / demo123
Doctor:  doctor@demo.local / demo123
```

## How to proceed toward production

1. **Confirm the core consultation journey.** Finish the UI for call-room joining, in-call vitals, ending a consultation, and displaying saved advice/prescriptions.
2. **Complete the ASHA workflow.** Add a dedicated dashboard for assisted registration, consent, symptoms, vital capture, and a clear pending-sync list.
3. **Build reliable low-network behavior.** Implement encrypted local storage, retry/sync conflict rules, and tested SMS/IVR or operator fallback. Do not store patient records in unencrypted browser storage.
4. **Harden the API.** Use production MongoDB, secret management, restrictive CORS, rate limits, audit trails, document upload scanning, authorization tests, and backup/retention policies.
5. **Test the real care flow.** Add API tests, browser tests, WebRTC/network-quality tests, and usability testing with patients, ASHA workers, and clinicians in weak-connectivity locations.
6. **Deploy and observe.** Add separate staging/production environments, HTTPS, monitoring, error reporting, health checks, database backups, and incident procedures.

## Important limits before real clinical use

The current repository is a development/demo system. SOS/ambulance dispatch, driver matching, hospital dispatch, production SMS/IVR fallback, encrypted offline synchronization, deployment hardening, and a full security/compliance review are not complete. Do not use it to make real clinical decisions until those items are implemented, tested, and approved by the responsible healthcare organization.

## Main project locations

- `frontend/src/App.jsx` — landing page, patient portal, doctor portal and in-app documentation.
- `frontend/src/styles.css` — responsive visual design.
- `index.js` — Express server and Socket.IO setup.
- `routes/` and `controllers/` — API endpoints and business logic.
- `models/` — Mongoose data structures.
- `TELECONSULTATION_PLATFORM_ARCHITECTURE.md` — expanded functional architecture.
- `TELECONSULTATION_DASHBOARD_FUNCTIONAL_SPEC.md` — planned production dashboard specification.
