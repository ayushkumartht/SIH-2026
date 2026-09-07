# ASHA Worker Module

## Overview

The ASHA Worker module acts as a field-level healthcare
coordination interface between the patient, doctor, ambulance
services and hospital.

The ASHA worker monitors the patient's health condition,
records symptoms and vitals, connects the patient with a doctor,
handles emergency/SOS situations, and coordinates ambulance
services when required.

---

## Role of ASHA Worker

The ASHA worker acts as a bridge between:

- Patient
- Doctor
- Ambulance
- Hospital

The ASHA worker does not replace the doctor. Instead, the ASHA
worker helps collect patient information, monitor the patient's
condition, connect the patient with the doctor and coordinate
emergency services.

---

## Main Functionalities

### 1. Patient Monitoring

The ASHA worker can:

- Register patients
- View patient details
- Record patient symptoms
- Record vital signs
- Monitor patient health status
- Identify patients requiring attention
- Manage patient follow-ups

### 2. Patient Vitals

The ASHA worker can record:

- Temperature
- Heart rate
- SpO2
- Respiratory rate
- Systolic blood pressure
- Diastolic blood pressure

Abnormal readings can be flagged for further medical attention.

### 3. Doctor Consultation

When a patient requires medical consultation:

1. ASHA selects the patient.
2. Patient symptoms and vitals are recorded.
3. ASHA connects the patient with the doctor.
4. Doctor assesses the patient.
5. Doctor provides advice/prescription.
6. Consultation information is recorded.

### 4. Network-Aware Consultation

The system adapts the consultation according to network quality.

| Network Condition | Consultation Mode |
|---|---|
| Good | HD Video |
| Moderate | Low-resolution Video + Audio |
| Poor | Audio-only |
| Very Poor / Offline | SMS/IVR Symptoms + Vitals |

### 5. Emergency / SOS Management

The ASHA worker can handle emergency cases.

When an emergency is detected:

1. Create an SOS request.
2. Record emergency severity.
3. Capture patient location.
4. Initiate ambulance search.
5. Monitor ambulance response.
6. Coordinate patient transport.
7. Escalate the case if required.

### 6. Ambulance Coordination

The ASHA worker can:

- Check nearby ambulance availability
- Request an ambulance
- Monitor driver response
- Track ambulance status
- Share patient location
- Try the next available driver if there is no response
- Escalate to PHC/control room when required

### 7. Hospital Referral

For critical cases:

- Match the patient with an appropriate hospital
- Share required patient information
- Pre-alert the hospital
- Track referral status
- Record patient handover

### 8. Follow-up Management

The ASHA worker can:

- View pending follow-ups
- Identify patients requiring another visit
- Update follow-up status
- Prioritize urgent cases

### 9. Offline Support

The ASHA worker may operate in areas with weak connectivity.

The system supports:

- Local recording of patient information
- Local storage of visit/vital records
- Pending synchronization
- Synchronization when connectivity is restored

---

## ASHA Worker Workflow

```text
Patient
   ↓
ASHA Worker
   ↓
Symptoms + Vitals
   ↓
Patient Condition
   ↓
Doctor Consultation
   ↓
Doctor Assessment
   ↓
Emergency Detected?
   ├── No
   │    ↓
   │  Advice / Prescription
   │    ↓
   │  Follow-up
   │
   └── Yes
        ↓
       SOS
        ↓
   Find Ambulance
        ↓
   Driver Response
        ↓
   Ambulance Dispatched
        ↓
   Hospital Matching
        ↓
   Hospital Pre-alert
        ↓
   Patient Handover
        ↓
   Audit Log