# Video Teleconsultation Module Task

## Document Purpose

This document consolidates the requirements, audit findings, implementation status, testing steps, and production-readiness tasks for the Video Teleconsultation module.

The scope is limited to video consultation. SOS/Emergency Dispatch is explicitly out of scope.

## Scope Boundary

### Included

- Patient / ASHA video consultation
- Doctor dashboard and doctor room joining
- Daily.co room path
- Raw WebRTC room path
- Socket.IO signaling
- Network quality measurement and tier changes
- HD video
- Low-resolution video with audio priority
- Audio-only mode
- Very poor/offline state indication
- Consultation vitals
- Call lifecycle and ending
- Demo mode without MongoDB for local testing

### Explicitly Excluded

- SOS / Emergency Dispatch
- Ambulance
- Driver matching or driver calling
- Hospital dispatch
- Mobility fallback implementation
- Twilio driver calling
- Emergency model/controller/routes
- Frontend changes unrelated to teleconsultation

## Required User Flow

```text
Patient / ASHA opens consultation
        |
        v
Video consultation room
        |
        v
Network quality measurement
        |
        +-- Good       -> HD video
        |
        +-- Moderate   -> Low-resolution video with audio priority
        |
        +-- Poor       -> Audio-only call
        |
        +-- Very poor  -> SMS/IVR symptoms plus ASHA vitals workflow
        |
        v
Doctor assessment
        |
        +-- Not urgent -> Prescription / advice
```

## Existing Architecture

- Backend runtime: Node.js ES modules.
- HTTP framework: Express.
- Database: MongoDB through Mongoose in normal mode.
- Realtime transport: Socket.IO.
- Video providers:
  - Daily.co REST room creation.
  - Raw WebRTC signaling through Socket.IO.
- Frontend: standalone browser test console in `frontend/`.
- Backend entry point: `index.js`.
- Daily controller: `controllers/dailyController.js`.
- Raw room creation: `controllers/doctorController.js`.
- Quality REST controller: `controllers/callQualityController.js`.
- Quality logic: `utils/networkQuality.js`.
- Room model: `models/CallRoom.js`.
- Demo room store: `services/callRoomStore.js`.

## Current Network Quality Contract

The backend is the source of truth for network tier calculation. The frontend must not create a second algorithm.

### Input metrics

- `rttMs`: non-negative number.
- `packetLossPercent`: number from `0` to `100`.

### Existing thresholds

| Tier | RTT | Packet loss | Media behavior |
|---|---:|---:|---|
| `hd` | <= 150 ms | <= 2% | Video and audio, up to 720p |
| `low_res` | <= 300 ms | <= 5% | Video and audio, up to 360p |
| `audio_only` | <= 600 ms | <= 10% | Audio enabled, video disabled |
| `very_poor` | Above previous limits | Above previous limits | Media disabled; fallback is required |
| `unknown` | No metrics yet | No metrics yet | Initial state |

## Implemented Features

### Backend

- Shared quality calculation in `utils/networkQuality.js`.
- RTT validation.
- Packet-loss validation.
- Shared quality calculation for REST and Socket.IO.
- `CallRoom.networkTier` persistence.
- Current quality persistence.
- Quality history persistence.
- Call mode persistence: `daily` or `webrtc`.
- Vitals persistence against a call.
- Call status and ending timestamps.
- REST endpoint for quality updates:

```text
POST /api/doctors/calls/:callId/quality
```

- REST endpoint for vitals:

```text
POST /api/doctors/calls/:callId/vitals
```

- REST endpoint for ending a call:

```text
POST /api/doctors/calls/:callId/end
```

- Socket.IO quality update event:

```text
quality:update
```

- Socket.IO quality broadcast event:

```text
quality:changed
```

- Socket.IO call ending event:

```text
call:ended
```

- Socket.IO now runs on the actual HTTP server.
- Express stores the Socket.IO instance with `app.set('io', io)`.
- Demo mode bypasses MongoDB for teleconsultation testing.

### Frontend

- Standalone test console in `frontend/`.
- Raw WebRTC local media capture.
- Raw WebRTC offer/answer/ICE signaling.
- Daily.co browser SDK loading path.
- Daily room embedding path.
- Periodic RTT measurement.
- Packet-loss measurement where WebRTC stats are available.
- Quality updates sent to Socket.IO.
- REST fallback for quality updates when Socket.IO is unavailable.
- Server-selected quality tier is applied to media.
- HD mode.
- Low-resolution mode.
- Audio-only mode.
- Very poor/offline notice.
- Local video preview.
- Remote video rendering.
- Doctor dashboard role selector.
- One-click `Open doctor dashboard` button.
- Existing room ID join flow.
- Automatic doctor-tab room joining through URL parameters.
- Vitals form.
- Call ending and media cleanup.
- Manual buttons for testing HD, low-resolution, audio-only, and very poor tiers.

## Current Local Test Flow

### Start demo backend

```powershell
cd C:\Users\thron\OneDrive\Desktop\SIHBackend-main\SIHBackend-main
npm run demo
```

Demo mode does not require MongoDB. Its data is kept in memory and resets when the process restarts.

### Start frontend

Serve `frontend/` on port `5173`, for example:

```powershell
python -m http.server 5173 --directory frontend
```

Open:

```text
http://localhost:5173
```

### Test two-sided video

1. Select `Raw WebRTC`.
2. Enter `demo-doctor` as Doctor ID.
3. Enter `demo-patient` as Patient ID.
4. Click `Create room`.
5. Allow camera and microphone access.
6. Click `Open doctor dashboard`.
7. Allow camera and microphone in the new tab.
8. Both tabs should join the same room.
9. Each side should show the other participant's remote video.

### Test quality tiers

Use the frontend test buttons:

- HD: `80 ms`, `1%` packet loss.
- Low-res: `220 ms`, `3%` packet loss.
- Audio-only: `420 ms`, `7%` packet loss.
- Very poor: `900 ms`, `15%` packet loss.

### Test vitals and ending

1. Enter heart rate, SpO2, and blood pressure.
2. Click `Save vitals`.
3. Click `End call`.
4. The call status should become `ended`.

## Audit Status

### A. Already Complete for Local Demo

- [x] Backend starts in demo mode without MongoDB.
- [x] Frontend test console exists.
- [x] Raw WebRTC signaling path exists.
- [x] Doctor dashboard test tab exists.
- [x] Daily room demo path exists.
- [x] Shared backend quality algorithm exists.
- [x] RTT and packet loss are validated.
- [x] Network tier is persisted in CallRoom or demo memory.
- [x] REST quality update exists.
- [x] Socket.IO quality update exists.
- [x] Socket.IO quality broadcast exists.
- [x] Media mode changes without recreating the whole call.
- [x] Vitals can be stored against a call.
- [x] Call ending is recorded.
- [x] Manual quality transitions can be tested.
- [x] Frontend syntax validation passes.
- [x] Backend module import and syntax validation pass.

### B. Partially Complete

- [ ] Daily.co media quality application is implemented but requires a real Daily API key and a valid Daily domain.
- [ ] Raw WebRTC works as a browser test flow but needs production ICE/STUN/TURN configuration.
- [ ] Periodic packet-loss measurement is limited when WebRTC stats are unavailable.
- [ ] Very poor mode displays the fallback requirement but does not implement the full SMS/IVR symptoms workflow.
- [ ] Doctor dashboard is a test console, not a production doctor portal.
- [ ] Call identity currently uses string doctor and patient IDs in CallRoom.
- [ ] Demo mode is intended for local testing only.

### C. Not Yet Complete

- [x] Production JWT authentication for teleconsultation REST routes.
- [x] Socket.IO JWT authentication middleware.
- [x] Room membership authorization.
- [ ] Doctor/patient ownership checks.
- [x] Private Daily rooms with expiring participant tokens.
- [x] Dedicated Consultation clinical record separate from CallRoom.
- [x] Consent capture and consent audit.
- [x] Symptoms record linked to the consultation.
- [ ] Complete SMS/IVR symptom fallback.
- [ ] ASHA offline vitals sync workflow.
- [x] Doctor assessment form and persistence.
- [x] Prescription and advice records.
- [x] Follow-up scheduling.
- [x] Consultation history.
- [ ] Reconnect and network recovery state machine.
- [ ] Quality hysteresis to prevent rapid mode oscillation.
- [ ] Jitter and bitrate measurements.
- [ ] STUN/TURN deployment.
- [ ] Production monitoring and structured consultation metrics.
- [ ] OpenAPI documentation for teleconsultation endpoints.
- [ ] Integration tests for two participants and quality transitions.
- [ ] FHIR-compatible clinical data adapters.
- [ ] Data retention, backup, and disaster recovery policies.

## Government-Grade Improvements

### Identity and authorization

- Use distinct patient, ASHA, doctor, and administrator roles.
- Require JWT for room creation, joining, quality updates, vitals, and ending calls.
- Validate that a participant is assigned to the consultation.
- Do not allow arbitrary room IDs to be joined.

### Privacy and consent

- Ask for patient consent before media starts.
- Keep recording disabled by default.
- If recording is introduced, require explicit consent, encryption, retention rules, and audit access.
- Never log passwords, tokens, health data, or raw media content.

### Clinical record

Create a dedicated consultation record with:

- Consultation ID.
- Patient ID.
- Doctor ID.
- ASHA ID.
- Appointment ID.
- Consent status.
- Symptoms.
- Vitals.
- Call start and end times.
- Network history.
- Doctor assessment.
- Diagnosis or clinical impression.
- Prescription/advice.
- Follow-up date.
- Consultation outcome.

### Reliability

- Add TURN servers for difficult networks.
- Add reconnect handling.
- Add call resume behavior.
- Add quality hysteresis.
- Add backend and Socket.IO health checks.
- Add structured logs and monitoring.
- Add retry and idempotency behavior.

### Interoperability

- Version APIs under `/api/v1`.
- Publish OpenAPI documentation.
- Keep clinical data compatible with FHIR concepts such as Patient, Encounter, Observation, and MedicationRequest.
- Keep government health ID integration behind a separate adapter.

### Audit

Record immutable events for:

- Consultation created.
- Participant joined.
- Consent accepted.
- Network tier changed.
- Vitals recorded.
- Doctor assessment saved.
- Prescription issued.
- Call ended.
- Record viewed.
- Record downloaded.
- Unauthorized access rejected.

## Recommended Implementation Order

1. Add authentication to all teleconsultation REST endpoints.
2. Add Socket.IO JWT authentication.
3. Add room membership and participant authorization.
4. Change Daily rooms from public to private. (Complete)
5. Add expiring Daily participant tokens. (Complete)
6. Create a dedicated `Consultation` model. (Complete)
7. Link symptoms and vitals to the consultation.
8. Add explicit patient consent and consent audit events. (Complete)
9. Add doctor assessment and prescription/advice models.
10. Add reconnect and network recovery behavior.
11. Add quality hysteresis and jitter/bitrate metrics.
12. Configure production STUN/TURN servers.
13. Add OpenAPI documentation.
14. Add integration tests for both participants and all quality tiers.
15. Add monitoring, retention, backup, and incident procedures.
16. Add interoperability adapters only after the core consultation flow is stable.

## Files Currently Involved

### Frontend

- `frontend/index.html`
- `frontend/app.js`
- `frontend/styles.css`

### Backend

- `index.js`
- `controllers/dailyController.js`
- `controllers/doctorController.js`
- `controllers/callQualityController.js`
- `routes/doctorRoutes.js`
- `models/CallRoom.js`
- `services/callRoomStore.js`
- `utils/networkQuality.js`

### Existing supporting modules

- `middleware/auth.js`
- `models/OfflineRequest.js`
- `controllers/webhookController.js`
- `utils/smsSender.js`
- `utils/smsParser.js`

## Files That Must Not Be Touched for This Scope

- Emergency dispatch controllers and routes.
- Emergency dispatch models.
- Ambulance models and services.
- Driver models and services.
- Hospital dispatch logic.
- Twilio driver calling.
- SOS-specific frontend screens.

## Validation Checklist

- [x] `node --check frontend/app.js` passes.
- [x] Backend modified modules pass `node --check`.
- [x] Demo room creation was tested.
- [x] Demo quality update was tested.
- [x] Demo vitals persistence was tested.
- [x] Demo call ending was tested.
- [x] Daily demo room creation was tested.
- [x] Browser frontend smoke test passed.
- [ ] `npm test` passes. The repository currently has no configured test suite and exits with `no test specified`.
- [ ] Production Daily call tested with a real API key.
- [ ] Two real browsers/devices tested over separate networks.
- [ ] MongoDB-backed production call tested.
- [ ] Authentication and authorization tests added.

## Prompt and Documentation Audit

The workspace was checked for Markdown and prompt instruction files.

- `README.md` exists and describes Node.js, Express, MongoDB, JWT, Socket.IO, WebRTC, Daily.co, and offline support.
- No `.prompt.md` files were found.
- No `.instructions.md` files were found.
- No `AGENTS.md` file was found.
- No `copilot-instructions.md` file was found.
- This document consolidates the available repository documentation and the teleconsultation requirements from the work session.

## Completion Definition

The module can be marked production-ready only when all of the following are complete:

- Authenticated patient/ASHA and doctor flows.
- Secure room membership.
- Private Daily rooms or secured raw WebRTC signaling.
- Reliable HD to low-res to audio-only transitions.
- Network recovery without unnecessary call recreation.
- Vitals, symptoms, consent, assessment, and prescription linked to one consultation.
- SMS/IVR fallback fully implemented for offline conditions.
- Immutable audit events.
- Monitoring, tests, documentation, and deployment controls.
