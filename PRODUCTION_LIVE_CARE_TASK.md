# Production Live Care Task — Patient and Doctor Connection

## Goal

Deliver a secure live teleconsultation workflow in which an authenticated patient and their assigned doctor can join the same appointment room, communicate by WebRTC, exchange consultation-scoped vitals and reports, and—only after explicit consent—share an approximate current location for that consultation.

## Non-negotiable privacy rules

- A doctor can access only consultations assigned to that doctor.
- A patient can access only their own records, reports, appointments, rooms and location records.
- Location sharing is off by default, must be explicitly enabled for one consultation, and expires automatically.
- Never put patient IDs, tokens, coordinates, or report URLs in public browser URLs.
- All production traffic must use HTTPS; camera, microphone and browser geolocation will not be reliable or safe otherwise.
- Uploaded reports need authenticated object storage, malware scanning, signed download URLs, retention controls and audit events before public launch.

## Implemented backend foundation

- `POST /api/portal/calls/session` creates or reuses one appointment-linked room for the assigned patient or doctor.
- `POST /api/portal/calls/:callId/consent` records patient consultation consent.
- `GET /api/portal/calls/:callId` returns authorized room/consultation details.
- `POST /api/doctors/calls/:callId/vitals` records vitals for authorized call participants.
- `POST /api/doctors/calls/:callId/quality` records backend-calculated quality tiers.
- `POST /api/doctors/calls/:callId/end` ends the room and completes the consultation.
- Socket.IO authenticates production users and carries WebRTC signaling and room events.

## Work to complete before a real clinical launch

1. Deploy an HTTPS API plus a TURN server; STUN-only WebRTC will fail on many mobile/carrier networks.
2. Configure managed MongoDB with backups, encryption, restricted network access and monitored migrations.
3. Deploy frontend/backend separately with environment-specific CORS allowlists and secrets.
4. Add rate limits, CSRF strategy where cookies are used, secure refresh-token lifecycle, audit retention and penetration testing.
5. Replace local report file handling with private object storage, virus scanning and short-lived signed downloads.
6. Perform clinical safety, consent wording, accessibility, language, data-protection and incident-response review with the responsible healthcare organisation.
7. Add automated API, authorization, WebRTC integration, browser, load and network-degradation tests.

## Live test scenario

1. Patient and doctor sign in through separate browser profiles.
2. Patient books a video appointment with the doctor.
3. Patient opens the waiting room and grants consent.
4. Doctor chooses the same appointment and joins the call.
5. Both grant browser camera/microphone permission; the call falls back to audio when video is unavailable.
6. Patient optionally submits vitals and shares their current location for this consultation.
7. Doctor sees the consultation-scoped vitals, reports and consented location.
8. Doctor records assessment, advice, prescription and follow-up; either participant ends the call.

## Acceptance criteria

- An unrelated account receives `403` for a room, report, vital or location request.
- Location cannot be written without consent and expires automatically.
- A location request contains only the current consultation’s coordinates and accuracy; no background location tracking exists.
- Vitals remain attached to the consultation and are available to the assigned doctor.
- The production deployment uses HTTPS and TURN and passes a two-network call test.
