# Teleconsultation Dashboard Functional Specification

## 1. Purpose

This document defines the functions, screens, permissions, states, and implementation requirements for every dashboard in the Teleconsultation Platform.

Use this document together with:

- `TELECONSULTATION_PLATFORM_ARCHITECTURE.md`
- `TASK_TELECONSULTATION.md`

This specification covers teleconsultation and related healthcare operations. SOS/Emergency Dispatch remains a separate module.

## 2. Common Dashboard Rules

Every authenticated dashboard must provide:

- Role-based navigation.
- Facility and language context.
- Secure logout and session-expiry handling.
- Loading, empty, error and retry states.
- Offline indicator where applicable.
- Accessible labels and keyboard navigation.
- Audit logging for sensitive actions.
- Mobile responsive behavior.
- No patient health information in URLs.
- No tokens in URLs.

## 3. Dashboard Map

| Dashboard | Primary user | Priority | Device |
|---|---|---:|---|
| Patient | Patient | Highest | Mobile |
| ASHA | ASHA worker | Highest | Mobile/tablet |
| Doctor | Doctor | Highest | Desktop/tablet |
| Operations | Telemedicine operator | High | Desktop |
| Facility Admin | Hospital/facility admin | High | Desktop |
| Government Analytics | District/state admin | Medium | Desktop |
| Lab | Lab staff | Medium | Desktop/tablet |
| Pharmacy | Pharmacy staff | Medium | Desktop/tablet |

## 4. Patient Dashboard

### Main objective

Allow a patient to start or continue care with the minimum number of steps.

### Navigation

- Home
- Start consultation
- My consultations
- Prescriptions
- Reports
- Profile
- Help

### Home functions

- Show patient name and facility.
- Start consultation.
- Rejoin an active consultation.
- Show doctor and waiting status.
- Show current call mode.
- View latest prescription and follow-up.
- Show pending offline sync.
- Open helpdesk.

### Start consultation flow

1. Confirm patient identity.
2. Select language.
3. Enter symptoms.
4. Confirm facility.
5. Read privacy and consent notice.
6. Accept consent.
7. Check microphone/camera.
8. Check network.
9. Join doctor queue.

Camera failure must not prevent an audio-only consultation.

### Video screen functions

- Show doctor name and remote video.
- Show local preview.
- Show HD, low-resolution, audio-only or offline status.
- Mute/unmute.
- Camera on/off.
- Reconnect.
- Submit vitals when ASHA-assisted.
- End consultation.

### Completion functions

- Show doctor assessment.
- Show prescription and advice.
- Show follow-up date.
- View consultation history.
- Download or view reports.

## 5. ASHA Worker Dashboard

### Main objective

Allow an ASHA worker to assist multiple patients in low-connectivity areas.

### Navigation

- Today
- Register patient
- Patient search
- Start consultation
- Vitals
- Pending sync
- History
- Help

### Today functions

- View today's patient list.
- View waiting, active and completed consultations.
- View records pending sync.
- Search patient.
- Continue a pending workflow.

### Registration functions

Capture:

- Name.
- Age/date of birth.
- Gender.
- Phone/contact.
- Village/facility.
- Optional health identifier.
- Consent status.

Offline registration must use a temporary local ID and sync safely later.

### Vitals functions

Capture:

- Temperature.
- Heart rate.
- Respiratory rate.
- Oxygen saturation.
- Systolic and diastolic blood pressure.
- Source and measurement time.

Allow save, edit, submit to doctor and offline retry.

### Assisted consultation functions

- Select/register patient.
- Capture consent and symptoms.
- Add vitals.
- Join as assistant.
- Continue in low-resolution or audio-only mode.
- Submit symptoms through the offline workflow.
- Confirm doctor advice with patient.

## 6. Doctor Dashboard

### Main objective

Give doctors a focused clinical workspace for safe and efficient consultations.

### Navigation

- Queue
- Active consultation
- Patients
- History
- Prescriptions
- Reports
- Availability
- Profile

### Home functions

- Set available, busy or offline.
- See waiting queue.
- See active consultation.
- See follow-ups due today.
- Open patient history.
- Rejoin a call.

### Queue functions

Each item shows patient reference, symptoms summary, ASHA indicator, vitals availability, waiting time and network readiness.

Actions:

- Accept.
- Defer.
- Reject with reason.
- Open patient summary.

### Clinical workspace

Sections:

1. Patient identity.
2. Video/audio call.
3. Current network quality.
4. Symptoms.
5. Vitals.
6. Medical history.
7. Reports.
8. Assessment.
9. Prescription.
10. Advice.
11. Follow-up.
12. Completion.

Actions:

- Mute/unmute.
- Camera on/off.
- Reconnect.
- View previous records.
- Add assessment.
- Mark not urgent, urgent or referred.
- Add medicine/advice.
- Schedule follow-up.
- Complete consultation.

### Prescription functions

Capture medicine name, dosage, frequency, duration, instructions and doctor notes.

Actions:

- Save draft.
- Issue prescription.
- Correct before final submission.
- Send to patient.
- Send to pharmacy when enabled.

## 7. Telemedicine Operations Dashboard

### Main objective

Monitor live service delivery and resolve operational failures.

### Navigation

- Live queue
- Active calls
- Doctor availability
- Failed calls
- Offline records
- Network analytics
- Support

### Functions

- View patients waiting and assigned doctors.
- Assign or reassign consultations.
- Monitor call duration and current tier.
- See reconnect count and failed calls.
- Assist reconnection.
- Mark technical failure.
- Create support ticket.
- Track average waiting time.
- Track HD, low-resolution, audio-only and offline percentages.

## 8. Facility Admin Dashboard

### Navigation

- Overview
- Staff
- Doctors
- Departments
- Schedules
- Consultations
- Reports
- Audit logs
- Settings

### Functions

- Create, activate and deactivate staff.
- Assign roles and departments.
- Manage schedules and doctor availability.
- View facility consultation workload.
- View waiting time and quality distribution.
- Review audit logs.
- Export approved facility reports.

## 9. Government Analytics Dashboard

### Navigation

- State/district overview
- Facilities
- Workforce
- Service quality
- Network performance
- Compliance
- Reports

### Functions

- Compare facilities and districts.
- View consultation volume.
- View doctor utilization.
- View waiting time and completion rate.
- View HD, low-resolution, audio-only and offline usage.
- View follow-up completion.
- Export aggregate reports.

### Privacy

- Aggregate data by default.
- Hide patient names.
- Restrict exports.
- Log every report view and download.
- Require elevated permission for identifiable records.

## 10. Lab Dashboard

- View pending test requests.
- Search patient and consultation.
- Upload report.
- Validate report metadata.
- Notify doctor.
- Publish report to patient.
- View upload and correction history.

## 11. Pharmacy Dashboard

- Receive prescriptions.
- Check medicine stock.
- Mark medicine available/unavailable.
- Mark prescription processed.
- Record pickup or delivery.
- Notify patient/facility.
- Generate stock reports.

## 12. Permissions Matrix

| Function | Patient | ASHA | Doctor | Operator | Facility admin | Government admin |
|---|---:|---:|---:|---:|---:|---:|
| Start own consultation | Yes | Assisted | No | No | No | No |
| Assist patient | No | Yes | No | No | No | No |
| Join assigned call | Yes | Yes | Yes | Support only | No | No |
| View clinical data | Own | Assisted | Assigned | Limited | Facility scope | Aggregate |
| Add vitals | Own/assisted | Yes | Yes | No | No | No |
| Add assessment | No | No | Yes | No | No | No |
| Issue prescription | No | No | Yes | No | No | No |
| Manage staff | No | No | No | No | Yes | Policy scope |
| View analytics | No | No | Limited | Yes | Facility | Yes |

All permissions must be enforced on the backend, not only in the frontend.

## 13. API Functions by Dashboard

### Patient and ASHA

```text
POST   /api/v1/consultations
GET    /api/v1/consultations/:id
POST   /api/v1/consultations/:id/consent
POST   /api/v1/consultations/:id/vitals
POST   /api/v1/consultations/:id/quality
POST   /api/v1/call-rooms
POST   /api/v1/call-rooms/:id/join-token
POST   /api/v1/consultations/:id/end
```

### Doctor

```text
GET    /api/v1/doctor/queue
POST   /api/v1/doctor/queue/:id/accept
GET    /api/v1/consultations/:id
PATCH  /api/v1/consultations/:id/assessment
POST   /api/v1/consultations/:id/prescription
POST   /api/v1/consultations/:id/follow-up
GET    /api/v1/consultations/:id/history
```

### Operations and administration

```text
GET    /api/v1/operations/queue
GET    /api/v1/operations/active-calls
GET    /api/v1/operations/failed-calls
GET    /api/v1/operations/network-metrics
PATCH  /api/v1/operations/consultations/:id/assign
GET    /api/v1/admin/staff
POST   /api/v1/admin/staff
PATCH  /api/v1/admin/staff/:id
GET    /api/v1/admin/audits
```

### Analytics

```text
GET    /api/v1/analytics/overview
GET    /api/v1/analytics/facilities
GET    /api/v1/analytics/network-quality
GET    /api/v1/analytics/outcomes
GET    /api/v1/analytics/export
```

## 14. Socket Events

### Client to server

```text
join
quality:update
offer
answer
ice-candidate
leave
```

### Server to client

```text
peer-joined
peer-left
quality:changed
call:ended
consultation:assigned
consultation:updated
sync:available
```

Every event must verify authentication, room membership, consultation reference and payload shape.

## 15. Required Screen States

Every screen must define loading, empty, offline, permission denied, validation error, server error, retry and success states.

Video screens additionally require camera permission denied, microphone permission denied, unsupported browser, doctor not connected, network degradation, reconnecting, remote participant ended and offline fallback states.

## 16. Patient-Friendly Rules

- Never show MongoDB IDs to patients.
- Use a human-readable consultation reference.
- Keep the primary action visible.
- Use one question per step where possible.
- Use Hindi, Punjabi and English labels.
- Keep forms short.
- Use voice or assisted input where practical.
- Do not expose RTT, packet loss or WebRTC terms to patients.
- Translate technical states into plain language.
- Always provide a support path.

## 17. Acceptance Criteria

### Patient

- Start consultation in fewer than five primary steps.
- Join with audio if camera is unavailable.
- See current consultation mode.
- View completed advice and prescription.

### ASHA

- Register a patient offline.
- Record and submit vitals.
- Join a consultation.
- See pending sync records until they are uploaded.

### Doctor

- View and accept a queue item.
- See symptoms and vitals during a call.
- Save assessment and advice.
- Issue prescription and follow-up.
- Be blocked from unauthorized patient records.

### Operations and administration

- Monitor active calls and failures.
- Identify audio-only and offline cases.
- View waiting-time metrics.
- Manage staff and schedules.
- View aggregate analytics.
- Review permission-protected audits.

## 18. Implementation Phases

### Phase 1: Demo foundation

- Keep current local demo functional.
- Keep `DEMO_MODE` isolated from production.
- Verify two-sided Raw WebRTC.
- Verify Daily path.
- Verify quality transitions, vitals, consultation, consent and audits.

### Phase 2: Patient and ASHA product

- Build landing page.
- Build patient dashboard.
- Build ASHA dashboard.
- Add multilingual and offline foundations.

### Phase 3: Doctor product

- Build doctor queue.
- Build clinical consultation workspace.
- Build prescription, advice and follow-up screens.

### Phase 4: Operations and administration

- Build operations dashboard.
- Build facility admin dashboard.
- Build government analytics dashboard.

### Phase 5: Supporting services

- Build lab dashboard.
- Build pharmacy dashboard.
- Add reporting and compliance exports.

## 19. Current Demo Mapping

The current test console demonstrates:

- Patient/ASHA and doctor room roles.
- ASHA worker patient registration, search, local vitals and pending-sync workflow.
- Raw WebRTC call.
- Daily room path.
- Quality transitions.
- Vitals submission.
- Consultation assessment.
- Consent.
- Call ending.
- Demo mode without MongoDB.

It is an integration console, not the final role-based product dashboard.

## 20. Scope Protection

This specification does not implement or redesign:

- SOS/Emergency Dispatch.
- Ambulance operations.
- Driver assignment.
- Hospital dispatch.
- Twilio driver calling.
- Emergency fallback state machines.

Those workflows require separate dashboards, permissions, state machines and operational rules.
