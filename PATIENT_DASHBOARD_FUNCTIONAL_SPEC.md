# Patient Dashboard Functional Specification

## 1. Purpose

The Patient Dashboard is the patient-facing workspace of Nabha Care. It helps a patient onboard, discover doctors, book consultations, join a secure live video call, view medical information, receive notifications, and continue supported workflows during low connectivity.

The primary showcase flow is:

```text
Patient signup/login
        |
        v
Patient dashboard
        |
        v
Doctor discovery and availability
        |
        v
Book appointment
        |
        v
Consultation waiting room
        |
        v
Live doctor-patient video consultation
        |
        +--> HD video
        +--> Low-resolution video
        +--> Audio-only mode
        +--> Very-poor-network fallback
        |
        v
Doctor assessment, advice, and prescription
        |
        v
Patient history and follow-up
```

## 2. User Role

**Primary user:** Patient

The patient can access only their own profile, appointments, consultations, medical records, prescriptions, reports, notifications, and emergency requests. Patient health information must not be exposed in public URLs or to another patient.

## 3. Dashboard Home

### Required information

- Patient name and profile summary.
- Assigned or preferred doctor.
- Upcoming appointment.
- Appointment status: pending, confirmed, active, completed, or cancelled.
- Next consultation date and time.
- Recent consultation activity.
- Latest assessment and advice.
- Latest prescription status.
- Recent lab report status.
- Pending notification count.
- Offline or low-internet indicator.

### Quick actions

- Find a doctor.
- Book appointment.
- Join upcoming consultation.
- View medical records.
- View prescriptions.
- View lab reports.
- Raise emergency request.
- Open symptom checker.

### Dashboard states

- Loading state while patient data is fetched.
- Empty state for a new patient without appointments or records.
- Error state with retry action.
- Offline state with cached data and pending-sync indicator.
- Session-expired state that returns the patient to login.

## 4. Patient Onboarding and Account

### Signup fields

- Full name.
- Email address.
- Password.
- Age or date of birth.
- Gender.
- Phone number.
- Village, facility, or location where supported.
- Consent status.

### Account actions

- Sign in.
- Sign out.
- Change password.
- Update contact information.
- Update language preference.
- View active sessions.
- Recover account through the configured recovery flow.

### Current project support

- Patient signup and login are available through the React patient dashboard.
- Demo credentials are available in demo mode:

```text
Email: patient@demo.local
Password: demo123
```

- Production persistence requires MongoDB and a configured `MONGO_URI`.

## 5. Appointments

### Appointment features

- Search doctors by name or specialization.
- View doctor availability.
- Select consultation date and time.
- Select video consultation type.
- Add reason or symptoms for the appointment.
- Book appointment.
- View appointment history.
- Cancel appointment.
- Reschedule appointment.
- View appointment status.
- Join when the appointment is ready.

### Appointment states

```text
Available
  -> Booking
  -> Confirmed
  -> Waiting for doctor
  -> Active consultation
  -> Completed

Confirmed
  -> Cancelled
  -> Rescheduled
```

### Expected API contract

```text
GET  /api/portal/patient/doctors
POST /api/portal/patient/appointments
GET  /api/portal/patient/appointments
PUT  /api/portal/patient/appointments/:id
DELETE /api/portal/patient/appointments/:id
```

The exact availability and rescheduling endpoints must remain aligned with the backend contract. The patient UI must not invent a separate appointment algorithm.

## 6. Consultation Waiting Room

After a confirmed appointment, the patient opens a waiting room before entering the call.

### Waiting room content

- Doctor name and specialization.
- Appointment date and time.
- Consultation reason.
- Consent confirmation.
- Camera permission status.
- Microphone permission status.
- Network readiness check.
- Doctor waiting/available status.
- Join consultation button.
- Reconnect or retry action.
- Help and fallback information.

### Join rules

- The patient can join only their own authorized call room.
- The room must be created or retrieved idempotently.
- The patient must grant consultation consent before joining.
- Camera failure must not block an audio-only consultation.
- The patient must see a clear error when the doctor or room is unavailable.

## 7. Live Doctor-Patient Video Consultation

This is the main showcase feature of the Patient Dashboard.

### Patient call screen

```text
+------------------------------------------------------+
| Doctor name | Consultation status | Network quality |
+----------------------------+-------------------------+
|                            | Doctor information     |
|        Doctor video        | Symptoms               |
|                            | Vitals                 |
|   Patient local preview    | Reports                |
|                            | Advice status          |
+----------------------------+-------------------------+
| Mic | Camera | Speaker | Reconnect | End call       |
+------------------------------------------------------+
```

### Patient controls

- Mute or unmute microphone.
- Turn camera on or off.
- Switch between front and back camera on mobile where supported.
- Show or hide local preview.
- Reconnect to the call.
- End consultation.
- View current network tier.
- Submit vitals during the call.
- See doctor availability and connection status.

### Media technology

The existing media engine should be reused rather than rebuilt:

- Raw WebRTC for browser-to-browser media.
- Daily.co integration path for managed video rooms.
- Socket.IO for room joining and WebRTC signaling.
- JWT authentication for room authorization.
- Backend-selected network quality tiers.

### Socket.IO events

```text
connect
join(roomId)
peer-joined
offer
answer
ice-candidate
quality:update
quality:changed
call:ended
leave
```

### REST endpoints

```text
POST /api/doctors/create-room
POST /api/doctors/create-daily-room
POST /api/doctors/daily-room/:roomName/token
GET  /api/doctors/calls/:callId/consultation
POST /api/doctors/calls/:callId/quality
POST /api/doctors/calls/:callId/vitals
POST /api/doctors/calls/:callId/end
```

### Live video showcase scenario

1. Open the Patient Dashboard in one browser tab.
2. Sign in as `patient@demo.local` with password `demo123`.
3. Open the Doctor Dashboard in a second browser tab.
4. Sign in as `doctor@demo.local` with password `demo123`.
5. Patient selects a doctor and books a video appointment.
6. Patient opens the consultation room.
7. Doctor opens the matching consultation.
8. Both browsers allow camera and microphone permissions.
9. Patient sees the doctor remote video and local preview.
10. Doctor sees the patient remote video and local preview.
11. Move through HD, low-resolution, audio-only, and fallback states during the demo.
12. Submit vitals from the patient side.
13. Doctor records assessment, advice, and prescription.
14. Either participant ends the call.
15. Patient views the completed consultation status and prescription.

## 8. Network Quality and Low Connectivity

The backend is the single source of truth for network quality.

| Tier | Typical condition | Patient experience |
|---|---|---|
| `hd` | RTT up to 150 ms and packet loss up to 2% | Video and audio, up to 720p |
| `low_res` | RTT up to 300 ms and packet loss up to 5% | Lower-resolution video with audio priority |
| `audio_only` | RTT up to 600 ms and packet loss up to 10% | Video disabled, audio remains active |
| `very_poor` | Beyond supported thresholds | Video/audio stop and fallback workflow opens |
| `unknown` | No measurements yet | Initial connection state |

### Patient UI behavior

- Show a visible quality badge.
- Explain each transition in plain language.
- Preserve audio when switching to audio-only.
- Offer reconnect before ending the consultation.
- Do not calculate a separate conflicting frontend tier.
- Show fallback symptoms and vitals workflow when the network is very poor.

## 9. Medical Records

### Patient features

- View past medical records.
- View current medical history.
- View consultation notes where authorized.
- View doctor advice and follow-up date.
- View linked reports.
- Download records for offline use.
- Show the date and source of every record.

### Privacy requirements

- Records must be fetched only for the authenticated patient.
- Sensitive data must not appear in URL query parameters.
- Downloads must require an authenticated request.
- Cached records must be protected on shared devices.
- Every sensitive view or download should be auditable in the production release.

## 10. Prescriptions

### Patient features

- View digital prescriptions.
- See medicine name.
- See dosage.
- See frequency.
- See duration.
- See doctor instructions.
- See issue date and follow-up date.
- Download or save prescription for offline viewing.
- See prescription status: draft, published, or completed.

### Future medicine availability

Medicine availability alerts require a pharmacy inventory contract. The patient UI should show the feature as unavailable or planned until that API is implemented; it must not display fabricated stock data.

## 11. Lab Reports

### Supported report types

- Blood tests.
- Scans.
- X-rays.
- Diagnostic documents.
- Other uploaded laboratory reports.

### Patient features

- View newly uploaded reports.
- See report title, date, and uploaded-by information.
- Open or download report files.
- Receive a notification when a report is available.
- Mark report as viewed.
- Cache approved reports for offline access.

### Report states

```text
Uploaded -> Available -> Viewed -> Downloaded
```

## 12. Notifications

### Notification types

- Appointment reminder.
- Appointment confirmed.
- Appointment cancelled or rescheduled.
- Doctor is ready for consultation.
- Lab report uploaded.
- Prescription published.
- Medicine availability update.
- Emergency request status update.
- Offline data synchronized.

### Notification behavior

- Show unread count on the dashboard.
- Allow notification detail view.
- Mark notification as read.
- Deep-link to the authorized feature.
- Support browser or mobile notifications only after permission is granted.
- Keep notifications safe if the device is shared.

## 13. Emergency / SOS

### Intended patient flow

- Patient taps the emergency action.
- Patient confirms the request.
- Patient details and current location are sent to authorized staff.
- Patient receives request status updates.
- Staff or doctor acknowledges the request.

### Current phase status

SOS is intentionally not connected to the current teleconsultation implementation phase. The following are deferred:

- Ambulance dispatch.
- Driver matching.
- Hospital dispatch.
- Twilio driver calling.
- Emergency location workflow.
- Production emergency notification pipeline.

The patient dashboard should keep SOS visibly separate from normal consultation actions until those APIs are production-ready.

## 14. AI Symptom Checker

### Patient experience

- Patient enters symptoms in plain language.
- System returns possible health concerns.
- System indicates whether urgent clinical review may be needed.
- Patient can continue to appointment booking.
- Patient sees a clear medical disclaimer.
- AI output never replaces a doctor diagnosis.

### Current phase status

The AI symptom checker is planned but not implemented as a production service in the current backend. Do not present placeholder suggestions as medical advice. The feature should remain marked as planned until an approved model, safety review, and clinical escalation flow exist.

## 15. Multilingual Support

### Required behavior

- Language selector in profile and onboarding.
- Translated navigation and action labels.
- Translated consent and privacy text.
- Translated network and fallback messages.
- Patient-entered symptoms remain available to the doctor in the original language.
- Language preference persists across sessions.

### Current phase status

The language framework and translation catalog are not yet complete. The first production catalog should cover English, Hindi, and Punjabi before expanding to additional languages.

## 16. Offline and Low-Internet Support

### Supported offline goals

- View downloaded medical records.
- View downloaded prescriptions.
- View cached appointment details.
- Save supported patient information locally.
- Queue supported vitals or symptom submissions.
- Sync queued data when the connection returns.
- Clearly label pending versus submitted data.

### Very-poor consultation fallback

```text
Video unavailable
      |
      v
Symptoms capture
      |
      v
Vitals capture
      |
      v
SMS / IVR or assisted ASHA workflow
      |
      v
Doctor receives the fallback record
```

### Current phase status

The UI can show a very-poor-network state, but secure production offline storage and synchronization are still pending. The current demo must not claim that local records have reached the server until a successful sync response is received.

## 17. Acceptance Checklist

### Dashboard

- [ ] Patient identity is loaded from the authenticated session.
- [ ] Upcoming appointment is visible.
- [ ] Recent activity is visible.
- [ ] Quick actions work on mobile and desktop.
- [ ] Loading, empty, error, and offline states are present.

### Appointment

- [ ] Doctor discovery works.
- [ ] Availability is shown from the backend.
- [ ] Patient can book a video appointment.
- [ ] Patient can cancel and reschedule after the backend endpoints are enabled.
- [ ] Appointment history is visible.

### Live video

- [ ] Patient and doctor can join the same authorized room.
- [ ] Local preview renders.
- [ ] Remote video renders.
- [ ] Microphone and camera controls work.
- [ ] HD, low-resolution, audio-only, and very-poor states are visible.
- [ ] Reconnect and end-call cleanup work.
- [ ] Vitals can be submitted during the call.

### Clinical information

- [ ] Medical records are patient-scoped.
- [ ] Prescriptions show medicine instructions.
- [ ] Lab reports can be viewed and downloaded.
- [ ] Notifications link to authorized content.
- [ ] Doctor assessment appears after completion.

### Deferred features

- [ ] SOS remains isolated until emergency APIs are ready.
- [ ] AI symptom checker remains marked as planned until clinically reviewed.
- [ ] Multilingual catalog is completed before claiming multilingual support.
- [ ] Offline sync is marked pending until server acknowledgement is implemented.

## 18. Local Demo Commands

From the repository root:

```powershell
npm run demo
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173/patient
http://localhost:5173/doctor
http://localhost:5173/docs
```

The React landing page contains the live product map and links to both role dashboards. The current demo uses in-memory accounts and resets demo data when the backend process restarts.
