# Production Frontend Integration Plan

## 1. Purpose

This document converts the teleconsultation integration map into an implementation plan for the SIH-2026 platform.

The goal is to connect the existing teleconsultation test console to the real healthcare workflow:

```text
Patient dashboard
  -> doctor discovery and appointment
  -> consultation waiting room
  -> teleconsultation
  -> doctor assessment
  -> prescription and advice
  -> consultation history
```

The existing video engine remains the foundation. This work integrates it into production screens instead of rebuilding WebRTC, Daily.co, Socket.IO signaling, or network-quality calculation.

## 2. Scope

### In scope

- Patient dashboard.
- Doctor discovery and appointment workflow.
- Patient consultation waiting room.
- Doctor consultation queue.
- Production teleconsultation screen.
- Reuse of Raw WebRTC and Daily.co media flows.
- Socket.IO room joining, signaling, quality updates, and call ending.
- Network-quality UI and media adaptation.
- Patient and ASHA vitals workflow.
- Doctor assessment, prescription, and advice.
- Consultation history.
- Mobile and desktop responsive behavior.
- Loading, empty, error, retry, offline, and permission states.

### Out of scope for this phase

- SOS or emergency dispatch integration.
- Ambulance or driver matching.
- Twilio driver calling.
- New emergency workflows.
- Rebuilding the video engine.
- Replacing the backend API without an audit.

## 3. Current Baseline

The repository contains a React + Vite frontend in `frontend/` and a Node.js/Express backend.

### Existing frontend capabilities to preserve

- Local camera and microphone preview.
- Remote video rendering.
- Raw WebRTC offer, answer, and ICE signaling.
- Daily.co room joining path.
- Socket.IO connection and room joining.
- Network RTT and packet-loss measurement.
- Backend-selected quality tiers.
- HD, low-resolution, audio-only, and very-poor media behavior.
- Vitals submission.
- Consultation assessment submission.
- Call ending and media cleanup.
- Doctor dashboard test-tab flow.

### Existing backend contracts confirmed in the repository

| Purpose | Method | Endpoint or event |
|---|---|---|
| Health check | GET | `/api/health` |
| Doctor details | GET | `/api/doctors/:doctorId` |
| Doctor calendar | GET | `/api/doctors/:doctorId/calendar` |
| Appointment list | GET | `/api/appointments` |
| Appointment create | POST | `/api/appointments` |
| Create Raw WebRTC room | POST | `/api/doctors/create-room` |
| Create Daily room | POST | `/api/doctors/create-daily-room` |
| Consultation for call | GET | `/api/doctors/calls/:callId/consultation` |
| Consultation update | PATCH | `/api/doctors/consultations/:id` |
| Quality update | POST | `/api/doctors/calls/:callId/quality` |
| Vitals update | POST | `/api/doctors/calls/:callId/vitals` |
| End call | POST | `/api/doctors/calls/:callId/end` |
| Socket room join | event | `join` |
| Socket quality update | event | `quality:update` |
| Socket quality broadcast | event | `quality:changed` |
| Socket call ending | event | `call:ended` |
| WebRTC signaling | events | `offer`, `answer`, `ice-candidate` |

The appointment routes currently require authenticated admin or receptionist roles. Before building patient booking screens, confirm whether the backend should expose patient-safe appointment endpoints or whether booking remains staff-assisted.

## 4. Target Frontend Route Map

The React frontend uses a lightweight path-based router. The following route map is the production information architecture.

| Route | Role | Screen | Primary purpose |
|---|---|---|---|
| `/login` | All | Login | Authenticate and store session safely |
| `/patient` | Patient | Patient dashboard | Show upcoming consultation and actions |
| `/patient/doctors` | Patient | Doctor discovery | Search doctors and view availability |
| `/patient/doctors/:doctorId` | Patient | Doctor profile | Review doctor and available slots |
| `/patient/appointments` | Patient | Appointments | View, book, cancel, or reschedule |
| `/patient/appointments/:appointmentId` | Patient | Consultation detail | Show status and join readiness |
| `/patient/consultations/:consultationId/waiting` | Patient | Waiting room | Check readiness before joining |
| `/patient/consultations/:consultationId/call` | Patient | Teleconsultation | Join and conduct consultation |
| `/patient/consultations/:consultationId/completed` | Patient | Completion | Show advice and prescription availability |
| `/patient/history` | Patient | Consultation history | Review previous consultations |
| `/patient/prescriptions/:prescriptionId` | Patient | Prescription | View or download prescription |
| `/doctor` | Doctor | Doctor dashboard | Show queue, active call, and availability |
| `/doctor/queue` | Doctor | Consultation queue | Accept and join waiting patients |
| `/doctor/consultations/:consultationId/call` | Doctor | Doctor call | Conduct call and review patient data |
| `/doctor/consultations/:consultationId/assessment` | Doctor | Assessment | Record clinical assessment and advice |
| `/doctor/consultations/:consultationId/prescription` | Doctor | Prescription editor | Create and send prescription |
| `/doctor/history` | Doctor | Doctor history | Review completed consultations |
| `/asha` | ASHA worker | ASHA dashboard | Manage assisted patients and pending sync |
| `/asha/patients/:patientId/vitals` | ASHA worker | Vitals capture | Capture and submit patient vitals |
| `/asha/consultations/:consultationId/call` | ASHA worker | Assisted consultation | Support a patient during the call |
| `*` | All | Not found | Provide a recoverable navigation state |

Do not put tokens or sensitive patient health information in URLs.

## 5. Component Map

The exact folder names can follow the selected frontend framework. This map is intentionally framework-neutral and can also be introduced incrementally into the current static frontend.

```text
frontend/
  app/
    AppShell
    Router
    AuthGuard
    RoleGuard
    ErrorBoundary
  auth/
    LoginPage
    authClient
    sessionStore
  shared/
    LoadingState
    EmptyState
    ErrorState
    OfflineBanner
    PermissionBanner
    Modal
    Button
    StatusBadge
    PageHeader
    PatientSummary
    VitalsPanel
  api/
    httpClient
    authApi
    doctorApi
    patientApi
    appointmentApi
    consultationApi
    vitalsApi
    prescriptionApi
  realtime/
    socketClient
    roomEvents
    qualityEvents
  media/
    ConsultationMediaEngine
    WebRtcSession
    DailySession
    MediaControls
    LocalVideo
    RemoteVideo
    NetworkQualityIndicator
    useMediaTier
  patient/
    PatientDashboard
    DoctorDiscovery
    DoctorProfile
    AppointmentList
    AppointmentDetail
    ConsultationWaitingRoom
    PatientConsultationScreen
    ConsultationCompleted
    ConsultationHistory
    PrescriptionView
  doctor/
    DoctorDashboard
    ConsultationQueue
    DoctorConsultationScreen
    PatientContextPanel
    DoctorAssessmentForm
    PrescriptionEditor
    DoctorHistory
  asha/
    AshaDashboard
    PatientRegistration
    PatientSearch
    VitalsForm
    AssistedConsultation
    PendingSync
  consultation/
    consultationState
    ConsultationHeader
    ConsultationActions
    SymptomsPanel
    VitalsPanel
    AssessmentPanel
    FallbackWorkflow
```

## 6. Shared State Model

Keep session, appointment, consultation, media, and network state separate. Do not store all workflow state in one global object.

```js
session = {
  userId,
  role,
  accessToken,
  expiresAt,
}

appointment = {
  id,
  patientId,
  doctorId,
  scheduledAt,
  status,
}

consultation = {
  id,
  appointmentId,
  roomId,
  callMode,
  status,
  symptoms,
  vitals,
  assessment,
  advice,
}

media = {
  connected,
  localStream,
  remoteStream,
  microphoneEnabled,
  cameraEnabled,
  mode,
}

network = {
  tier,
  rttMs,
  packetLossPercent,
  lastUpdatedAt,
}
```

## 7. Phase-by-Phase Implementation

### Phase 0: Foundation and API audit

**Goal:** establish the production frontend foundation without changing the media engine.

Tasks:

- Keep the React + Vite frontend build and environment-based API URL configuration.
- Add environment-based backend URL configuration.
- Add a single HTTP client that attaches the JWT and normalizes errors.
- Add session persistence and logout.
- Add protected route and role checks.
- Document the exact response shapes of existing controllers.
- Confirm patient permissions for doctor discovery and appointment booking.
- Confirm consultation ID and call-room ID relationship.
- Add a frontend lint and test command.

Acceptance criteria:

- A user can log in, reload the page, and retain a valid session.
- Expired sessions redirect to `/login`.
- API errors show a usable message and retry action.
- No token or patient health data is placed in a URL.

### Phase 1: Patient dashboard and appointments

**Goal:** allow a patient to reach a confirmed consultation without test-only inputs.

Tasks:

- Implement `PatientDashboard`.
- Implement doctor discovery and doctor profile views.
- Display doctor availability from the existing doctor and calendar APIs.
- Implement appointment list and detail views.
- Use existing appointment APIs where authorization supports the patient flow.
- If current appointment authorization is staff-only, add a backend contract for patient booking before building the booking UI.
- Add loading, empty, error, and cancellation states.

Acceptance criteria:

- Patient sees upcoming, active, completed, and cancelled appointments.
- Patient can navigate from an appointment to the consultation detail page.
- The join action is disabled before the appointment is ready.
- Appointment identifiers are handled safely and no sensitive details appear in the URL.

### Phase 2: Waiting room and consultation lifecycle

**Goal:** connect an appointment to a real call room.

Tasks:

- Implement `ConsultationWaitingRoom`.
- Create or retrieve a call room through the backend.
- Replace demo doctor and patient IDs with authenticated user identities.
- Display scheduled time, doctor name, consent state, microphone permission state, and network readiness.
- Add a reconnect action.
- Add a clear transition from waiting room to call screen.
- Ensure a patient cannot join another patient’s room.

Acceptance criteria:

- An authorized patient can open the waiting room from an appointment.
- The call screen receives a real room ID and call mode from the backend.
- Refreshing the waiting room does not create duplicate rooms.
- Unauthorized room access is rejected and shown as an error.

### Phase 3: Production teleconsultation screen

**Goal:** move the working media engine into the patient and doctor workflows.

Tasks:

- Extract the remaining Raw WebRTC logic from the legacy test flow into a React `WebRtcSession` component.
- Extract Daily.co logic into `DailySession`.
- Expose one media-engine interface so the screen does not care which call mode is used.
- Reuse local preview, remote video, microphone, camera, speaker, leave, and reconnect behavior.
- Replace manual room setup with consultation context.
- Remove demo room IDs, debug event logs, manual quality buttons, and test-only fields from production screens.
- Keep a separate developer-only test console until production behavior is verified.
- Add permission-denied, device-missing, peer-disconnected, and reconnecting states.

Acceptance criteria:

- Patient and doctor can join the same consultation from their dashboards.
- Raw WebRTC calls exchange offer, answer, and ICE candidates.
- Daily.co calls use the backend-created room and token.
- Camera and microphone controls work independently.
- Ending the call cleans up tracks, socket listeners, and room state.

### Phase 4: Network-quality adaptation and fallback

**Goal:** make network behavior understandable and safe for real users.

Tasks:

- Reuse the backend quality calculation as the only tier algorithm.
- Send measured RTT and packet loss through `quality:update`.
- Listen for `quality:changed` and apply the server-selected tier.
- Show user-facing labels for HD, low resolution, audio only, and very poor/offline.
- Keep audio enabled when the tier is `audio_only`.
- Show a fallback workflow when the tier is `very_poor`.
- Add retry and reconnect controls.
- Prevent rapid UI oscillation by displaying the latest server state consistently.
- Log quality transitions for diagnostics without exposing sensitive patient data.

Acceptance criteria:

- Both call participants see the same selected network tier.
- The UI does not independently override the backend tier.
- Audio-only mode disables video but keeps audio available.
- Very poor mode clearly directs the user to the fallback workflow.
- A temporary network failure can recover without a full page reload.

### Phase 5: Vitals and ASHA workflow

**Goal:** make vitals available to the doctor during a consultation.

Tasks:

- Build reusable `VitalsForm` and `VitalsPanel` components.
- Support temperature, heart rate, respiratory rate, oxygen saturation, and blood pressure.
- Record source and measurement time.
- Allow ASHA workers to save patient vitals before or during the call.
- Display the latest saved vitals to the doctor.
- Add retry and pending-sync states for offline submissions.
- Keep unsent data locally only when the application has an explicit secure offline-storage design.

Acceptance criteria:

- Valid vitals can be saved against the correct call or consultation.
- Doctor sees updated vitals without losing the video session.
- Invalid ranges are rejected with field-level messages.
- Offline entries are visibly marked pending and are not falsely shown as submitted.

### Phase 6: Doctor assessment and prescription

**Goal:** complete the non-emergency clinical workflow.

Tasks:

- Build `PatientContextPanel` with symptoms, vitals, history, and reports.
- Build `DoctorAssessmentForm` for symptoms, assessment, advice, and follow-up.
- Connect assessment updates to the existing consultation update endpoint.
- Add a prescription data model and API contract if one does not already exist.
- Build `PrescriptionEditor` with medicine, dosage, frequency, duration, and instructions.
- Add validation and a confirmation step before sending.
- Mark the consultation completed only after the required clinical fields are saved.
- Keep SOS as a future endpoint; do not call or implement it in this phase.

Acceptance criteria:

- Doctor can save a draft assessment.
- Doctor can submit assessment and advice.
- Patient can see completed consultation status.
- Patient can view the final prescription after it is published.
- A failed save does not silently complete the consultation.

### Phase 7: History, reporting, and production hardening

**Goal:** make completed consultations usable after the live call ends.

Tasks:

- Build patient consultation history.
- Build doctor consultation history.
- Add prescription viewing and download behavior according to the product privacy requirements.
- Add audit events for sensitive actions.
- Add accessibility review and keyboard navigation.
- Add responsive layouts for mobile patient and ASHA use and desktop doctor use.
- Add automated API and component tests.
- Add browser tests for the patient-to-doctor happy path and network fallback.
- Review CORS, token storage, authorization, rate limits, logs, and patient-data exposure.
- Add deployment environment documentation.

Acceptance criteria:

- A completed consultation is visible in both patient and doctor histories.
- Prescription and advice remain available after reload.
- Sensitive actions are auditable.
- The main workflow works on supported mobile and desktop viewport sizes.
- CI runs lint, unit tests, API tests, and the production build.

## 8. Teleconsultation Screen Contract

The production call screen should provide these regions:

```text
+------------------------------------------------------+
| Consultation header: doctor/patient, status, timer   |
+----------------------------+-------------------------+
|                            | Patient context         |
| Remote video               | Symptoms                |
|                            | Vitals                  |
| Local preview              | Reports                 |
|                            | Assessment / actions   |
+----------------------------+-------------------------+
| Network status | Mic | Camera | Reconnect | End     |
+------------------------------------------------------+
```

### Patient screen

- Doctor name and connection status.
- Remote doctor video.
- Local patient preview.
- Mute, camera, reconnect, and end controls.
- Network tier indicator.
- Vitals entry when patient or ASHA is responsible.
- Fallback message when the network is very poor.

### Doctor screen

- Patient video and local preview.
- Symptoms and patient identity context.
- Live vitals panel.
- Previous reports where authorized.
- Assessment and advice form.
- Prescription action.
- Call and consultation completion actions.

## 9. Media Engine Extraction Rules

The current test console should be treated as a reference implementation while extracting reusable logic.

### Keep

- WebRTC peer setup.
- Offer, answer, and ICE handling.
- Daily.co room join and token flow.
- Media-tier application.
- Network measurement.
- Socket.IO signaling.
- Call cleanup.

### Replace or remove from production UI

- Manual doctor and patient ID fields.
- Demo room identifiers.
- Manual quality shortcut buttons.
- Debug event log.
- Test-only backend URL field.
- Popup-based doctor dashboard flow.
- Direct test-console assessment layout.

### Required media-engine safeguards

- Remove all socket listeners when a consultation ends.
- Stop every local media track on leave.
- Destroy the Daily frame on cleanup.
- Cancel quality polling when the screen unmounts.
- Handle duplicate join attempts idempotently.
- Never expose Daily secrets in browser code.
- Obtain Daily access tokens only from the authenticated backend.

## 10. Backend Gaps To Resolve Before UI Completion

The frontend should not invent missing backend behavior. Confirm or implement these contracts first:

1. Patient-safe doctor discovery and availability responses.
2. Patient appointment booking authorization and response shape.
3. Appointment-to-consultation creation or retrieval behavior.
4. Idempotent call-room creation for an appointment.
5. Doctor queue and waiting-status endpoints.
6. Consultation history endpoint for patients and doctors.
7. Prescription model, controller, validation, and routes.
8. Secure patient history and report authorization.
9. Offline request synchronization contract.
10. Audit events for assessment and prescription actions.

## 11. Testing Strategy

### Unit tests

- API client error normalization.
- Auth/session expiry.
- Consultation state transitions.
- Network-tier display mapping.
- Media cleanup.
- Vitals validation.
- Prescription validation.

### API tests

- Appointment permissions.
- Consultation room authorization.
- Vitals ownership and validation.
- Assessment updates.
- Prescription visibility.
- Call ending and idempotency.

### Browser tests

1. Login as patient.
2. Open dashboard.
3. Select doctor and appointment.
4. Open waiting room.
5. Join as patient.
6. Login as doctor in a second context.
7. Join the same consultation.
8. Verify remote media and Socket.IO room events.
9. Submit vitals.
10. Save assessment and advice.
11. End the call.
12. Verify patient history and prescription state.
13. Simulate HD, low-resolution, audio-only, and very-poor conditions.
14. Verify reconnect and permission-denied states.

## 12. Definition Of Done

The production frontend integration is complete when:

- A patient can progress from login to appointment to consultation without test-only fields.
- A doctor can see and accept a consultation from a real queue.
- Both users can join the same authorized call room.
- Existing WebRTC or Daily.co media works inside the production call screen.
- Network quality is calculated by the backend and reflected consistently in both clients.
- Vitals reach the correct doctor and consultation.
- The doctor can save assessment, advice, and prescription.
- The patient can see completed consultation history and prescription.
- SOS remains unimplemented and clearly isolated for a later phase.
- Automated tests cover the main workflow and failure states.
- Production security, authorization, accessibility, and responsive behavior have been reviewed.
