# Nabha Care — Tech Stack

## Frontend
- **React 19** + **Vite 7** — SPA for Patient, Doctor, ASHA dashboards
- **React Leaflet + Leaflet.js** — live location & nearby-hospital maps (OpenStreetMap tiles)
- **Socket.IO Client** — real-time signaling & live updates
- **WebRTC** — peer-to-peer video/audio teleconsultation
- **Mermaid.js** — architecture diagrams (docs page)

## Backend
- **Node.js** + **Express 5** — REST API server
- **Socket.IO** — WebRTC signaling, live call quality, emergency alerts
- **JWT (jsonwebtoken)** — role-based authentication (patient, doctor, ASHA, lab, admin, receptionist)
- **bcryptjs** — password hashing
- **Multer** — medical report/file uploads
- **express-validator** — request validation
- **Helmet, express-rate-limit, CORS allowlist, Morgan** — security & logging hardening

## Database
- **MongoDB** + **Mongoose ODM** — patients, doctors, appointments, consultations, ambulances, emergencies

## Core Platform Features
- **Adaptive network-quality engine** — auto-tiers video calls (HD / low-res / audio-only) from RTT & packet loss for low-bandwidth rural connectivity
- **Emergency & Ambulance Dispatch** — geolocation-based nearest-ambulance matching (Haversine distance) with a full dispatch state machine
- **Consent-based location sharing** — time-boxed (2-hour expiry), audit-logged patient location for ASHA/doctor visibility
- **SMS Gateway (TextBee API)** — offline/no-smartphone appointment booking via SMS parsing

## DevOps & Tooling
- **Jest + Supertest** — backend testing
- **Nodemon** — dev auto-reload
- **Git/GitHub** — version control

## Problem Statement Alignment
Built for **SIH 2026 — Rural Telemedicine (Nabha, Punjab)**: addresses low doctor availability, long travel distances, and ~31% rural internet connectivity through offline-tolerant, low-bandwidth-first design.
