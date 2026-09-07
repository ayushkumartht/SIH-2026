# 404

# 🌍 Nabha Rural Healthcare & Telemedicine Platform  

A **telemedicine and hospital management system** designed to address the severe healthcare challenges faced by Nabha and surrounding rural villages.  
This platform connects **patients, doctors, lab staff, receptionists, pharmacies, and administrators** into a single digital ecosystem with **offline access, video consultations, and real-time medical updates**.  

---

## 📌 Problem Context  

Nabha and its surrounding rural areas face significant healthcare challenges:  
- Civil Hospital operates at less than 50% staff capacity (only **11 doctors for 23 sanctioned posts**).  
- Patients from **173 villages** travel long distances, often missing work, only to discover:  
  - Specialists are unavailable.  
  - Medicines are out of stock.  
- Poor road conditions and sanitation further hinder timely access to care.  
- Limited internet access (**only 31% of rural Punjab households are connected**) makes modern healthcare services inaccessible.  

---

## 🚨 Impact  

This situation directly affects:  
- **Daily-wage earners and farmers** → lose income due to travel and waiting.  
- **Patients with chronic conditions** → worsened health outcomes due to delays.  
- **Community well-being** → preventable complications increase healthcare costs.  

Solving this issue will:  
✅ Improve healthcare delivery.  
✅ Reduce unnecessary travel.  
✅ Enhance quality of life in rural Punjab.  
✅ Provide a **scalable model** for rural India.  

---

## 🎯 Expected Outcomes  

- ✅ **Multilingual Telemedicine App** for **video consultations** with doctors.  
- ✅ **Digital Health Records (EHR)** accessible **offline** for rural patients.  
- ✅ **Real-time updates** on medicine availability at local pharmacies.  
- ✅ **AI-powered Symptom Checker** optimized for low-bandwidth areas.  
- ✅ **Doctor & Hospital Management System** for appointments, reports, and emergencies.  
- ✅ **Scalable framework** for replication in other regions.  

---

## 👥 Stakeholders  

- **Rural Patients** → Access healthcare from home, no unnecessary travel.  
- **Doctors & Lab Staff** → Manage patients, upload reports, provide remote consultations.  
- **Receptionists** → Manage appointments, notify patients, track emergencies.  
- **Admins** → Oversee hospital operations, staff management, and reporting.  
- **Local Pharmacies** → Provide stock updates, linked with prescriptions.  
- **Punjab Health Department** → Monitor healthcare delivery at scale.  

---

## 🏥 Features – Hospital Side  

### 👨‍⚕️ Doctors
- View **assigned patients** and their medical history.  
- Add **diagnosis, prescriptions, and digital reports**.  
- Access **lab reports** uploaded by Lab Doctors.  
- Mark **availability status** (Busy, Free, On Leave).  
- Conduct **video consultations** with rural patients.  

### 🧪 Lab Doctors
- Upload **lab reports** (blood test, scans, x-rays).  
- Maintain **diagnostic history** for patients.  
- Share findings directly with treating doctors.  

### 💁 Receptionists
- Manage **appointments** (book, cancel, reschedule).  
- View **doctor availability** in real-time.  
- **Notify patients** when reports are ready.  
- Raise **emergency alerts** for doctors.  

### 🛠️ Admins
- Manage **doctors, lab staff, and receptionists**.  
- View **hospital-wide analytics**: patients, emergencies, staff workload.  
- Ensure **data security & compliance** (HIPAA/GDPR-ready).  

---

## 🧑‍🤝‍🧑 Features – Patient Side  

### 🔑 Access
- Multilingual **login & registration**.  
- Works on **low internet or offline mode** (syncs when online).  

### 📅 Appointments
- Book, cancel, or reschedule appointments.  
- View doctor availability.  

### 📋 Medical Records
- Access **past and current medical reports**.  
- Download reports offline.  

### 📢 Notifications
- Reminders for **appointments**.  
- Alerts for **medicine availability**.  
- Notifications when **lab reports are uploaded**.  

### 🚨 Emergency
- Raise **emergency requests** directly from the app.  
- Doctors & hospital staff get **instant alerts**.  

### 📹 Video Consultation
- Secure **telemedicine consultation** with doctors.    

### 🧠 AI Symptom Checker
- Patients enter symptoms → AI suggests:  
  - Possible health issues.  
  - Whether urgent consultation is needed.  

---

## 🔄 Workflow  

### Example: Regular Appointment  
1. Patient books an appointment via mobile app.  
2. Receptionist confirms and assigns doctor.  
3. Doctor checks patient’s medical history.  
4. Lab doctor uploads test results if needed.  
5. Doctor prescribes medicines → Pharmacy stock updated.  
6. Patient receives digital prescription + report on app.  

### Example: Emergency Case  
1. Patient marks condition as **Emergency**.  
2. Doctor receives instant alert with patient details.  
3. Admin logs emergency in system.  
4. Doctor attends immediately (in-person or video call).  

---

## ⚙️ Tech Stack  

- **Frontend (Patient & Hospital App):** React Native + Expo  
- **Backend (API):** Node.js + Express  
- **Database:** MongoDB (Mongoose ODM)  
- **Authentication:** JWT (role-based access control)  
- **Real-time Notifications:** Socket.IO and Message  
- **Telemedicine (Video Calling):** WebRTC + Daily.co API  
- **Offline Support:** AsyncStorage + Service Workers (sync when online)  


