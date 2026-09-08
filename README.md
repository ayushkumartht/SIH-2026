# Nabha Care — Rural Telemedicine Platform

A telemedicine and hospital-coordination platform built for **SIH 2026**, addressing the healthcare access gap in Nabha and its 173 surrounding villages in Punjab — where the Civil Hospital runs at under 50% staffed capacity and only ~31% of rural households have internet access.

## Problem context

- Civil Hospital Nabha: 11 doctors for 23 sanctioned posts.
- Patients travel long distances only to find specialists unavailable or medicines out of stock.
- Low, unreliable rural connectivity makes standard video-call telemedicine unreliable.

## What's implemented

### Patient
- Registration/login, doctor discovery, appointment booking with real slot-conflict prevention.
- Video/audio teleconsultation over WebRTC, with adaptive quality (HD → low-res → audio-only) based on live RTT/packet-loss.
- Consent-gated, time-boxed (2-hour) live location sharing with the assigned doctor during a call.
- Emergency SOS with geolocated ambulance dispatch tracking.
- Medicine availability lookup across hospitals.
- Book a ride: non-emergency transport request to a chosen hospital, dispatched by the same automated engine as SOS.
- Rule-based symptom triage (transparent keyword screen — not a diagnosis).
- Prescription history with PDF export.
- Offline-tolerant dashboard: cached record snapshot + an offline action queue (e.g. bookings made without connectivity sync automatically once back online).
- English / Hindi / Punjabi language switch.

### Doctor
- Queue, patient list, consultation history and clinical assessment editor.
- Live consultation with real-time network-quality indicator and vitals capture.
- Emergency alert queue with acknowledge/resolve actions.
- Patient live-location viewer (consent-gated, map-based).

### ASHA worker
- Field patient registration with recorded consent.
- Assisted vitals recording against a consultation.
- Consent-based field-visit location capture on a live map.
- Explicitly cannot prescribe, diagnose, or see unrelated patients — matches real ASHA role boundaries.

### Ambulance & cab dispatch (automated)
- Raising an SOS or booking a ride triggers the dispatch engine automatically — no admin step required to get things moving.
- It first looks for a nearby ambulance already marked available and auto-assigns it; if none is free, it cascades through registered drivers one at a time (in-app push + real Twilio voice call + SMS), each with a response timeout before moving to the next.
- A driver accepts via the Driver Dashboard, by pressing a key on the phone call, or by replying YES/NO to the SMS — all three funnel into the same accept/decline logic.
- On acceptance, the destination hospital is auto-matched by distance and capability (e.g. critical cases prefer a hospital with an ICU/trauma facility).
- If every driver is exhausted with no acceptance, the case escalates to the admin console for manual assignment (the original console still works as a fallback) with a full call-by-call audit log.
- Twilio is optional: without credentials configured, the whole flow still works end-to-end through the in-app accept/decline path — see `.env.example` for what's needed to enable real calls/SMS.

### Admin / Receptionist
- Emergency dispatch console: live queue with the automated dispatch outcome, an expandable per-case audit log (who was called, when, how they responded), and a manual assign/status fallback for escalated cases.
- Non-emergency transport request queue.
- Ambulance and driver fleet management (drivers get their own login credentials).
- Pharmacy stock management.
- Staff account management (admin only).

### Driver
- Own login and a live dashboard: toggle available/off-duty, receive incoming dispatch offers in real time with a countdown to accept/decline, track the active job on a map, and advance its status through to handover/completion.

### Backend/platform
- Node.js + Express + MongoDB (Mongoose), JWT auth with per-role authorization.
- Socket.IO for WebRTC signaling and live call-quality/emergency updates.
- SMS-based offline appointment booking (TextBee gateway) for patients without a smartphone.
- Helmet, rate limiting, and a CORS allowlist.
- Automated test suite (Jest + Supertest) covering auth, booking conflicts, ASHA consent rules, and the emergency dispatch lifecycle.

## Tech stack

See [avika.md](avika.md) for a slide-ready summary.

## Getting started

1. Install MongoDB (local service or Atlas) and set `MONGO_URI` in `.env` (copy from `.env.example`).
2. Set a real `JWT_SECRET` in `.env`. The server refuses to start without `MONGO_URI`/`JWT_SECRET`.
3. Install and seed:
   ```powershell
   npm install
   npm run seed
   npm run dev
   ```
4. In another terminal:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
5. Open `http://localhost:5173`. Routes: `/patient`, `/doctor`, `/asha`, `/admin`, `/driver`, `/docs`.

To enable real Twilio voice calls/SMS to drivers (optional — the dispatch engine works fully without it via in-app accept/decline), fill in `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and `PUBLIC_BASE_URL` in `.env`. For local dev, `PUBLIC_BASE_URL` needs a publicly reachable URL for Twilio's webhooks — run `ngrok http 3000` and paste the `https://*.ngrok-free.app` URL.

`npm run seed` prints every seeded account. All seeded passwords are `demo123`:

| Role | Email |
|---|---|
| Admin | admin@demo.local |
| Receptionist | receptionist@demo.local |
| Doctor | doctor@demo.local (+ 2 more) |
| Lab | lab@demo.local |
| ASHA | asha@demo.local |
| Patient | patient@demo.local (+ 1 more) |
| Driver | balwinder.driver@demo.local (+ 2 more) |

## Testing

```powershell
npm test
```

Runs the Jest/Supertest suite against an isolated `nabhacare_test` MongoDB database (never touches your seeded dev data).

## Architecture notes

- `app.js` — the configured Express app (routes, middleware) with no side effects, importable directly by tests.
- `index.js` — the runtime entrypoint: env checks, DB connection, HTTP server, Socket.IO.
- Every feature has exactly one canonical backend code path — duplicate/legacy endpoints from earlier iterations were removed rather than left running alongside working ones.

## Known scope boundaries

- The offline layer caches dashboard data and queues actions in IndexedDB; it is not a full installable PWA with app-shell precaching.
- Multilingual support covers the patient-facing app (per the problem statement); staff-facing dashboards (Doctor/ASHA/Admin) are English-only.
- The ambulance/cab dispatch workflow is a request → auto-match → cascade-call → assign → status-progression system; it does not integrate with physical vehicle GPS hardware, and the dispatch cascade's timers are in-memory (correct for this single-instance deployment, but would need a real job queue for a multi-instance production deployment).
- Production hardening still needed before clinical deployment: HTTPS, encrypted backups, formal privacy/compliance review, TURN server for WebRTC across restrictive networks, and device testing on low-end rural hardware.
