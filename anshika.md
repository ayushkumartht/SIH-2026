# Nabha Care — Research & Reference

Supporting research, domain context, and future scope for the Nabha Care rural telemedicine platform (SIH 2026). Companion to [avika.md](avika.md) (tech stack) and [README.md](README.md) (feature list).

## 1. Problem context (why this project)

- **Civil Hospital, Nabha (Punjab)**: runs at roughly half its sanctioned strength — 11 doctors against 23 sanctioned posts — serving Nabha town and its surrounding rural catchment.
- **173 villages** fall within the hospital's service radius, many a significant travel distance from any specialist care.
- **~31% rural internet penetration** in the region — the binding constraint behind every design decision in this app: adaptive video quality (HD → low-res → audio-only), an offline-tolerant patient dashboard with a sync queue, and SMS-based offline appointment booking all exist specifically to work around this.
- Patients frequently travel long distances only to find the specialist unavailable or medicines out of stock — the direct motivation for the doctor-availability search, the pharmacy stock lookup, and the ASHA-facilitated teleconsultation flow (bring the doctor to the patient instead of the patient to the doctor).

## 2. Domain references (real-world programs this design draws from)

These are established Indian public-health programs the platform's roles and workflows are modeled on — useful context/citations for a jury, not implementations of their actual software:

- **ASHA (Accredited Social Health Activist) program**, under the National Health Mission — community-level health workers who are explicitly *not* clinicians; they register patients, capture vitals, and connect villagers to formal healthcare. The ASHA Dashboard's design (register patient → connect to an online doctor using her own device → relay the doctor's instructions back → cannot prescribe or diagnose) mirrors this role boundary directly.
- **108 Emergency Ambulance Service** — the state-run dispatch model (call → nearest-vehicle match → dispatch → hospital handover) that the automated ambulance dispatch engine (`services/dispatchEngine.js`) is patterned after: check for a nearby available vehicle first, and only fall back to ringing individual registered drivers when none is free.
- **eSanjeevani** (Ministry of Health & Family Welfare's national teleconsultation platform) — a reference point for doctor-patient video teleconsultation at government scale, informing the consultation → assessment/prescription/advice → patient record flow.
- **Ayushman Bharat Health Account (ABHA) / Digital Health ecosystem** — the broader digital-health-ID direction this kind of platform would eventually need to interoperate with in a production deployment (not implemented here, but worth citing as the ecosystem this fits into).

## 3. Technical references

Official documentation for the core technologies (see [avika.md](avika.md) for the full stack list):

- React 19 — https://react.dev
- Express 5 — https://expressjs.com
- MongoDB / Mongoose — https://www.mongodb.com/docs/ , https://mongoosejs.com
- Socket.IO (WebRTC signaling, live dispatch/notification push) — https://socket.io/docs
- WebRTC (peer-to-peer audio/video) — https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- Leaflet / OpenStreetMap (maps, live ambulance/patient location) — https://leafletjs.com
- Twilio Voice & SMS (automated ambulance/cab driver dispatch calling) — https://www.twilio.com/docs/voice , https://www.twilio.com/docs/sms
- JWT (`jsonwebtoken`) — https://jwt.io

## 4. Design decisions worth citing in a report

- **Adaptive network quality tiers** (HD → low-res → audio-only → SMS/IVR fallback) directly address the ~31% connectivity figure rather than assuming broadband.
- **Sequential, not parallel, ambulance/driver dispatch cascade** — matches how a real dispatcher would call one driver at a time, and avoids the double-booking race a "ring everyone at once" design would create.
- **STUN-only WebRTC by default, with optional TURN** — documented explicitly as a known limitation (`frontend/.env.example`) rather than silently failing; a real deployment serving patients across different mobile carriers would need a TURN relay to be reliable.
- **No AI diagnosis claims** — the symptom checker is an explicit rule-based keyword screen ("red flag" symptoms), not an LLM, and is labeled as such. Overclaiming clinical AI capability was deliberately avoided.

## 5. Future scope / research directions

Concrete next steps beyond the current hackathon-scope build, for a "future work" slide:

1. **TURN relay in production** — needed for reliable cross-network video calls (mobile data ↔ home WiFi, different carriers). See `frontend/.env.example`.
2. **IoT vitals integration** — pulse oximeters / BP cuffs feeding vitals directly into a consultation instead of manual entry by ASHA/patient.
3. **Full offline-first PWA** — the current IndexedDB caching covers dashboard data and a sync queue; a true installable app-shell PWA would extend offline coverage further.
4. **Multi-instance dispatch scaling** — the current dispatch cascade timers are in-memory (correct for a single backend instance); a multi-server production deployment would need a real job queue (e.g. BullMQ/Redis).
5. **ABDM/ABHA interoperability** — linking patient records to the national digital health ID ecosystem.
6. **Staff-facing multilingual support** — i18n currently covers the patient app only (per the problem statement's rural-patient focus); extending it to Doctor/ASHA/Admin dashboards would help non-English-first field staff.
7. **Formal clinical/privacy compliance review** — HTTPS, encrypted backups, and a data-protection audit before any real clinical deployment, as already flagged in the README's scope boundaries.

## 6. Where to look in the codebase

| Topic | Key files |
|---|---|
| Adaptive call quality | `utils/networkQuality.js`, `frontend/src/LiveConsultation.jsx` |
| Ambulance/cab dispatch engine | `services/dispatchEngine.js`, `utils/dispatchStateMachine.js` |
| ASHA-facilitated teleconsultation | `controllers/ashaController.js`, `frontend/src/AshaDashboard.jsx` |
| Offline patient caching | `frontend/src/offlineCache.js` |
| Symptom checker (rule-based) | `frontend/src/PatientDashboard.jsx` (`RED_FLAG_SYMPTOMS`/`URGENT_SYMPTOMS`) |
