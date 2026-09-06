# Teleconsultation Platform Architecture and Dashboard Design

## 1. Document Purpose

This document defines the professional product architecture for the complete teleconsultation platform.

The current repository contains a working local demo. This document defines the production-grade structure that should be implemented around that demo.

SOS / Emergency Dispatch remains a separate module and is not redesigned here.

## 2. Product Vision

Provide simple, low-bandwidth, multilingual access to remote healthcare for patients and ASHA workers while giving doctors and administrators a secure, auditable operational system.

Primary experience:

```text
Patient or ASHA
    -> Easy access landing page
    -> Patient / ASHA dashboard
    -> Consultation request
    -> Network quality check
    -> HD video / low-resolution video / audio-only / offline workflow
    -> Doctor consultation
    -> Vitals, assessment, prescription and advice
    -> Follow-up and consultation history
```

## 3. Design Principles

- Patient-first and low-literacy friendly.
- Minimum steps for starting a consultation.
- Large touch targets and clear language.
- Hindi, Punjabi and English support.
- Mobile-first responsive design.
- Low-bandwidth by default.
- Audio is more important than video.
- No sensitive health information in URLs or browser local storage.
- Every clinical action is authenticated and auditable.
- SOS/Emergency Dispatch remains a separate workflow.
- Technical call data and clinical consultation data remain separate.

## 4. User Roles

| Role | Main responsibility | Primary interface |
|---|---|---|
| Patient | Request and attend consultation | Patient dashboard |
| ASHA worker | Register/help patient, capture symptoms and vitals | ASHA dashboard |
| Doctor | Conduct consultation and provide advice | Doctor dashboard |
| Telemedicine operator | Monitor queues and failed calls | Operations dashboard |
| Facility admin | Manage staff, facility workload and audit | Facility admin dashboard |
| Government admin | Monitor district/state performance | Government analytics dashboard |
| Lab staff | Upload and manage laboratory reports | Lab dashboard |
| Pharmacy staff | Process prescriptions and stock | Pharmacy dashboard |

## 5. Landing Page

The landing page should be useful immediately, not a marketing-only page.

### First viewport

- Government health service identity.
- Language selector: Hindi, Punjabi, English.
- Primary action: `Start consultation`.
- Secondary action: `ASHA worker login`.
- Doctor and staff login in a quieter secondary area.
- Emergency assistance should link to the separate SOS module, not mix with normal consultation.
- Visible low-bandwidth indicator.
- Accessibility controls.
- Facility helpline and support contact.

### Landing page structure

```text
Header
  - Service logo/name
  - Language selector
  - Accessibility settings
  - Staff login

Hero / immediate access area
  - Start consultation
  - Continue existing consultation
  - ASHA worker access

Service status strip
  - Doctors available
  - Average waiting time
  - Network/service status

How access works
  - Register or identify patient
  - Check network
  - Connect with doctor
  - Receive advice and prescription

Patient help
  - Supported languages
  - Offline/low-network information
  - Privacy and consent information

Footer
  - Privacy policy
  - Terms
  - Helpdesk
  - Version and facility information
```

### Landing page behavior

- `Start consultation` opens a short patient identification flow.
- Do not require a complex account before an ASHA-assisted consultation.
- Preserve a consultation reference code for returning users.
- Use progressive disclosure instead of large forms.
- Show clear loading, offline, retry and support states.

## 6. Patient Dashboard

The patient dashboard must be the easiest interface in the product.

### Main navigation

- Home
- Start consultation
- My consultations
- Prescriptions
- Reports
- Profile
- Help

### Home layout

```text
Welcome and patient name

Primary action
  [Start consultation]

Current consultation card
  - Waiting / connected / completed
  - Join button
  - Doctor name
  - Network mode

Quick actions
  - View prescription
  - View reports
  - Update profile

Recent care
  - Last consultation
  - Last advice
  - Follow-up date
```

### Patient consultation experience

1. Confirm patient identity.
2. Show privacy and consent notice.
3. Capture symptoms in simple language.
4. Optionally connect an ASHA worker.
5. Check camera, microphone and network.
6. Start consultation.
7. Show current mode: HD, low-resolution, audio-only or offline.
8. Display doctor assessment after completion.
9. Display prescription, advice and follow-up.

### Patient accessibility

- Large buttons.
- High contrast.
- Screen-reader labels.
- Audio prompts where possible.
- Do not rely only on color.
- Avoid dense tables.
- Use icons with text labels.
- Support weak devices and slow networks.

## 7. ASHA Worker Dashboard

The ASHA dashboard is optimized for repeated field use and multiple patients.

### Main navigation

- Today
- Register patient
- Start consultation
- Vitals
- Pending sync
- Consultation history
- Help

### ASHA home layout

```text
Today's patients

[Register patient]
[Start consultation]

Queue
  - Waiting for doctor
  - In consultation
  - Needs follow-up
  - Offline records to sync

Quick patient search
  - Name
  - Phone
  - Health ID/reference
```

### ASHA consultation workflow

- Select or register patient.
- Capture consent.
- Enter symptoms.
- Capture vitals.
- Start video consultation.
- Continue with low-resolution or audio-only mode if required.
- If offline, save symptoms and vitals locally in encrypted storage.
- Retry sync automatically when connectivity returns.
- Show sync status clearly.

## 8. Doctor Dashboard

The doctor dashboard is a work-focused clinical workspace, not a marketing page.

### Main navigation

- Queue
- Active consultation
- Patients
- History
- Prescriptions
- Reports
- Availability
- Profile

### Doctor dashboard layout

```text
Header
  - Doctor name
  - Facility
  - Availability toggle
  - Notifications

Queue column
  - Waiting patients
  - Priority based on consultation rules
  - Waiting time
  - ASHA indicator

Active consultation workspace
  - Patient identity
  - Video or audio call
  - Network mode
  - Connection status
  - Symptoms
  - Vitals
  - Previous reports
  - Doctor notes
  - Assessment
  - Prescription
  - Advice
  - Follow-up

Right information panel
  - Consultation timeline
  - Audit events
  - Previous consultations
```

### Doctor actions

- Accept consultation.
- Start or rejoin call.
- Mute audio.
- Turn camera on/off.
- View current network tier.
- View symptoms and vitals.
- Add assessment.
- Mark not urgent, urgent or referred.
- Issue prescription/advice.
- Set follow-up date.
- Complete consultation.

## 9. Telemedicine Operations Dashboard

For staff monitoring daily service delivery.

### Metrics

- Active consultations.
- Patients waiting.
- Available doctors.
- Average waiting time.
- Average consultation duration.
- Failed calls.
- Reconnected calls.
- Audio-only percentage.
- Offline fallback count.
- Unresolved sync records.

### Operational views

- Live queue.
- Doctor availability.
- Facility service health.
- Network quality distribution.
- Failed consultation recovery.
- Support tickets.

## 10. Facility Admin Dashboard

For hospital or health facility administration.

### Features

- Manage doctors and staff.
- Manage departments and schedules.
- View consultation workload.
- View facility-level outcomes.
- Review audit logs.
- Manage helpdesk users.
- Export approved reports.
- Configure facility settings.

## 11. Government Analytics Dashboard

For district, state or department-level oversight.

### Features

- Facility comparison.
- District-wise consultation volume.
- Doctor utilization.
- Patient waiting time.
- Network quality trends.
- Low-bandwidth usage.
- Audio-only and offline usage.
- Follow-up completion.
- Prescription/advice outcomes.
- Service availability.
- Compliance and audit status.

### Data protection

- Show aggregated data by default.
- Restrict patient-identifying information.
- Apply role-based export permissions.
- Log every report view and export.

## 12. Lab Dashboard

- Incoming test requests.
- Patient lookup.
- Upload report.
- Report validation.
- Doctor visibility.
- Patient report access.
- Upload audit history.

## 13. Pharmacy Dashboard

- Incoming prescriptions.
- Prescription status.
- Medicine availability.
- Stock update.
- Patient pickup status.
- Doctor and facility reporting.

## 14. Frontend Application Structure

A future production frontend should use a clear role-based structure:

```text
frontend/
  app/
    router/
    providers/
    auth/
  components/
    accessibility/
    layout/
    feedback/
    forms/
    video/
  features/
    patient/
    asha/
    doctor/
    operations/
    facility-admin/
    government-admin/
    lab/
    pharmacy/
    teleconsultation/
  services/
    apiClient.js
    authService.js
    consultationService.js
    socketService.js
    networkQualityService.js
  state/
    authStore.js
    consultationStore.js
    notificationStore.js
  i18n/
  styles/
```

The current standalone `frontend/` demo can become the teleconsultation feature inside this structure.

## 15. Backend Application Structure

```text
backend/
  modules/
    auth/
    patients/
    asha/
    doctors/
    teleconsultation/
      models/
      controllers/
      services/
      routes/
      sockets/
      validations/
      audit/
    reports/
    pharmacy/
    operations/
  middleware/
    authentication.js
    authorization.js
    validation.js
    rateLimit.js
    errorHandler.js
  config/
  shared/
    logger.js
    errors.js
    pagination.js
    ids.js
```

Current teleconsultation backend files should gradually move behind the teleconsultation module boundary without changing API contracts abruptly.

## 16. Core Teleconsultation Data Boundary

### Technical call record: `CallRoom`

Stores:

- Room ID.
- Mode: Daily or WebRTC.
- Current network tier.
- Quality history.
- Call status.
- Start/end timestamps.
- Technical end reason.

### Clinical encounter record: `Consultation`

Stores:

- Patient.
- Doctor.
- ASHA worker.
- Appointment.
- Consent.
- Symptoms.
- Vitals.
- Assessment.
- Prescription.
- Advice.
- Follow-up.
- Clinical outcome.
- Consultation timestamps.

### Audit record: `ConsultationAudit`

Stores:

- Consultation reference.
- Action.
- Actor.
- Role.
- Metadata.
- Timestamp.

## 17. Authentication and Access

- Patient can access only their own records.
- ASHA can access assigned or assisted patient consultations.
- Doctor can access assigned consultations.
- Facility admin can access facility-level records.
- Government admin sees aggregate data by default.
- Socket.IO requires JWT authentication.
- Room joining requires consultation participant authorization.
- Daily rooms are private and use expiring meeting tokens.
- Tokens must not be placed in URLs.
- Demo bypass must be disabled in production deployment.

## 18. API Boundary

Recommended versioned routes:

```text
POST   /api/v1/consultations
GET    /api/v1/consultations/:id
PATCH  /api/v1/consultations/:id
POST   /api/v1/consultations/:id/consent
POST   /api/v1/consultations/:id/vitals
POST   /api/v1/consultations/:id/assessment
POST   /api/v1/consultations/:id/prescription
GET    /api/v1/consultations/:id/audits
POST   /api/v1/consultations/:id/end
POST   /api/v1/consultations/:id/quality
POST   /api/v1/call-rooms
POST   /api/v1/call-rooms/:id/daily-token
```

The existing unversioned routes should remain temporarily for compatibility and be deprecated gradually.

## 19. Network Quality UX

The interface must always show the current mode using text and icon:

- `HD video`
- `Low-resolution video`
- `Audio-only`
- `Offline fallback required`
- `Recovering connection`

Rules:

- Do not recreate a call for every tier change.
- Downgrade quickly when quality drops.
- Recover gradually after stable improvement.
- Keep audio prioritized.
- Show retry and reconnect states.
- Store RTT, packet loss, jitter, bitrate and selected tier.

## 20. Offline and Low-Bandwidth Design

- Cache application shell.
- Encrypt pending patient data locally.
- Store an offline sync queue.
- Add retry with backoff.
- Use idempotency keys.
- Never silently discard failed records.
- Show pending sync count.
- Allow ASHA worker to continue data collection offline.
- Sync symptoms and vitals before media when connectivity returns.

## 21. Accessibility and Localization

- Hindi, Punjabi and English translations.
- Keyboard navigation.
- Screen reader labels.
- WCAG-aligned contrast.
- Minimum 44px touch targets.
- Text alternatives for icons.
- No color-only status indicators.
- Plain-language clinical status.
- Date/time localized to facility settings.
- Avoid unexplained technical network terminology for patients.

## 22. Security and Privacy

- HTTPS and WSS only.
- Short-lived access tokens.
- Refresh-token rotation where required.
- Private Daily rooms.
- Room authorization.
- Rate limiting.
- Input validation.
- Secure file uploads.
- No health data in client logs.
- No passwords or tokens in logs.
- Encryption at rest for sensitive data.
- Retention and deletion policy.
- Backup and disaster recovery plan.
- Immutable audit trail.

## 23. Observability

Track:

- API latency.
- Socket connection failures.
- Room join failures.
- Call duration.
- Quality tier transitions.
- Reconnect count.
- Audio-only percentage.
- Offline fallback count.
- Vitals sync failures.
- Doctor response time.
- Patient waiting time.

Use correlation IDs across frontend, REST, Socket.IO and audit events.

## 24. Implementation Order

### Phase 1: Current demo stabilization

1. Keep the current local demo functional.
2. Keep demo data behind `DEMO_MODE`.
3. Verify two-sided Raw WebRTC.
4. Verify Daily demo behavior.
5. Verify quality transitions.
6. Verify vitals, consultation, consent and audit records.

### Phase 2: Core production security

1. Enforce JWT in production.
2. Enforce Socket.IO JWT.
3. Enforce room participant authorization.
4. Remove demo bypass in production configuration.
5. Add rate limiting and security headers.
6. Add HTTPS/WSS deployment.

### Phase 3: Patient and ASHA product

1. Build landing page.
2. Build patient dashboard.
3. Build ASHA dashboard.
4. Add multilingual support.
5. Add offline encrypted sync.
6. Add patient consultation history.

### Phase 4: Doctor and operations product

1. Build doctor dashboard.
2. Build consultation queue.
3. Build operations dashboard.
4. Add doctor availability.
5. Add failed-call recovery.
6. Add facility administration.

### Phase 5: Clinical completion

1. Complete symptoms workflow.
2. Complete vitals workflow.
3. Complete doctor assessment.
4. Complete prescription/advice.
5. Complete follow-up workflow.
6. Add clinical exports.

### Phase 6: Government readiness

1. Add aggregated analytics.
2. Add compliance reporting.
3. Add OpenAPI documentation.
4. Add integration tests.
5. Add FHIR adapters.
6. Add monitoring and incident response.
7. Add backup and retention controls.

## 25. Current Repository Status

### Available now

- Local teleconsultation demo frontend.
- Patient/ASHA and doctor test-room flow.
- ASHA worker demo workspace with local patient registration, search, vitals and pending sync.
- Raw WebRTC signaling.
- Daily room path.
- Network quality tiers.
- JWT REST authentication.
- Socket.IO authentication.
- Room membership checks.
- Private Daily room/token path.
- Consultation clinical record.
- Consent and audit record.
- Vitals and quality history.
- Doctor assessment/advice fields.
- Demo mode without MongoDB.

### Still required for production

- Full role-specific production dashboards.
- Real patient identity flow.
- Real ASHA offline sync.
- Complete SMS/IVR symptom fallback.
- Production STUN/TURN servers.
- Quality hysteresis and advanced metrics.
- Full automated test suite.
- OpenAPI publication.
- Government identity/interoperability adapters.
- Monitoring, backup and retention operations.

## 26. Local Demo Commands

Backend:

```powershell
cd C:\Users\thron\OneDrive\Desktop\SIHBackend-main\SIHBackend-main
npm run demo
```

Frontend:

```powershell
python -m http.server 5173 --directory frontend
```

Open:

```text
http://localhost:5173
```

## 27. Scope Protection

Do not combine the normal teleconsultation navigation with SOS/Emergency Dispatch navigation.

The emergency module must have its own:

- Entry point.
- Permissions.
- State machine.
- Audit policy.
- Operational dashboard.
- Testing strategy.

This document covers the teleconsultation platform and dashboard architecture only.
