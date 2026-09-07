import React, { useEffect, useMemo, useRef, useState } from "react";
import LiveConsultation from "./LiveConsultation";
import { saveSnapshot, loadSnapshot, queueRequest, flushQueue } from "./offlineCache";

// ─── LeafletMap component (used in hospitals tab + location sharing) ───────────
function LeafletMap({ markers = [], center, zoom = 13, height = "380px", onHospitalClick }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (instanceRef.current) return;
    import("leaflet").then((L) => {
      delete L.default.Icon.Default.prototype._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      if (!mapRef.current) return;
      const map = L.default.map(mapRef.current).setView(center || [30.3753, 76.7821], zoom);
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "\u00a9 OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);
      instanceRef.current = { map, L: L.default, markers: [] };
      addMarkers(markers, instanceRef.current, onHospitalClick);
    });
    return () => {
      if (instanceRef.current?.map) {
        instanceRef.current.map.remove();
        instanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!instanceRef.current) return;
    const { map, L, markers: existing } = instanceRef.current;
    existing.forEach((m) => m.remove());
    instanceRef.current.markers = [];
    addMarkers(markers, instanceRef.current, onHospitalClick);
    if (center) map.setView(center, zoom);
  }, [markers, center, zoom]);

  function addMarkers(list, ctx, onClick) {
    if (!ctx || !list.length) return;
    list.forEach((m) => {
      const marker = ctx.L.marker([m.lat, m.lng]).addTo(ctx.map);
      if (m.popup) marker.bindPopup(m.popup);
      if (onClick && m.id) marker.on("click", () => onClick(m.id));
      ctx.markers.push(marker);
    });
  }

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%", borderRadius: "12px", border: "1px solid #dce7e0", overflow: "hidden" }}
    />
  );
}

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const labels = {
  English: {
    home: "Home",
    start: "Start consultation",
    consultations: "My consultations",
    prescriptions: "Prescriptions",
    reports: "Reports",
    hospitals: "Hospitals & Map",
    medicines: "Medicine availability",
    emergency: "Emergency",
    profile: "Profile",
    help: "Help",
    welcome: "Hello",
    welcomeSub: "Start a new consultation or continue your existing care journey.",
    startCta: "Start consultation",
    careStatus: "Care status",
    signOut: "Sign out",
    findDoctor: "Find a doctor",
    upcomingCare: "Upcoming care",
    recentCare: "Recent care",
    notifications: "Notifications",
    viewAll: "View all",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    loading: "Loading your care dashboard…",
  },
  Hindi: {
    home: "होम",
    start: "परामर्श शुरू करें",
    consultations: "मेरे परामर्श",
    prescriptions: "दवाइयाँ",
    reports: "रिपोर्ट",
    hospitals: "अस्पताल और नक्शा",
    medicines: "दवा उपलब्धता",
    emergency: "आपातकाल",
    profile: "प्रोफ़ाइल",
    help: "सहायता",
    welcome: "नमस्ते",
    welcomeSub: "नया परामर्श शुरू करें या अपनी देखभाल यात्रा जारी रखें।",
    startCta: "परामर्श शुरू करें",
    careStatus: "देखभाल की स्थिति",
    signOut: "साइन आउट करें",
    findDoctor: "डॉक्टर खोजें",
    upcomingCare: "आगामी देखभाल",
    recentCare: "हाल की देखभाल",
    notifications: "सूचनाएं",
    viewAll: "सभी देखें",
    save: "सहेजें",
    cancel: "रद्द करें",
    close: "बंद करें",
    loading: "आपका देखभाल डैशबोर्ड लोड हो रहा है…",
  },
  Punjabi: {
    home: "ਹੋਮ",
    start: "ਸਲਾਹ ਸ਼ੁਰੂ ਕਰੋ",
    consultations: "ਮੇਰੀਆਂ ਸਲਾਹਾਂ",
    prescriptions: "ਦਵਾਈਆਂ",
    reports: "ਰਿਪੋਰਟਾਂ",
    hospitals: "ਹਸਪਤਾਲ ਅਤੇ ਨਕਸ਼ਾ",
    medicines: "ਦਵਾਈ ਉਪਲਬਧਤਾ",
    emergency: "ਐਮਰਜੈਂਸੀ",
    profile: "ਪ੍ਰੋਫ਼ਾਈਲ",
    help: "ਮਦਦ",
    welcome: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ",
    welcomeSub: "ਨਵੀਂ ਸਲਾਹ ਸ਼ੁਰੂ ਕਰੋ ਜਾਂ ਆਪਣੀ ਦੇਖਭਾਲ ਯਾਤਰਾ ਜਾਰੀ ਰੱਖੋ।",
    startCta: "ਸਲਾਹ ਸ਼ੁਰੂ ਕਰੋ",
    careStatus: "ਦੇਖਭਾਲ ਸਥਿਤੀ",
    signOut: "ਸਾਈਨ ਆਊਟ",
    findDoctor: "ਡਾਕਟਰ ਲੱਭੋ",
    upcomingCare: "ਆਉਣ ਵਾਲੀ ਦੇਖਭਾਲ",
    recentCare: "ਹਾਲੀਆ ਦੇਖਭਾਲ",
    notifications: "ਸੂਚਨਾਵਾਂ",
    viewAll: "ਸਭ ਵੇਖੋ",
    save: "ਸੰਭਾਲੋ",
    cancel: "ਰੱਦ ਕਰੋ",
    close: "ਬੰਦ ਕਰੋ",
    loading: "ਤੁਹਾਡਾ ਦੇਖਭਾਲ ਡੈਸ਼ਬੋਰਡ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
  },
};
async function api(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      body.error || body.message || "Unable to load your care information",
    );
  return body.data ?? body;
}
function statusText(status) {
  return (
    {
      confirmed: "Confirmed",
      pending: "Waiting for confirmation",
      active: "Doctor is ready",
      completed: "Completed",
      cancelled: "Cancelled",
    }[status] || "Scheduled"
  );
}
// Rule-based symptom triage. Intentionally simple and transparent — not an AI
// diagnosis, just a red-flag keyword screen to help patients decide urgency.
const RED_FLAG_SYMPTOMS = [
  "chest pain", "difficulty breathing", "shortness of breath", "unconscious",
  "unresponsive", "seizure", "fits", "severe bleeding", "heavy bleeding",
  "blue lips", "can't breathe", "cannot breathe", "paralysis", "stroke",
  "severe head injury", "coughing blood", "vomiting blood", "suicidal",
];
const URGENT_SYMPTOMS = [
  "high fever", "persistent vomiting", "severe pain", "dehydration",
  "severe abdominal pain", "labour", "labor pain", "bleeding during pregnancy",
  "diabetic", "blood sugar",
];
function checkSymptoms(text) {
  const lower = text.toLowerCase();
  if (RED_FLAG_SYMPTOMS.some((s) => lower.includes(s))) {
    return {
      level: "emergency",
      label: "Seek emergency care now",
      advice: "These symptoms can be life-threatening. Use the SOS button to raise an emergency immediately, or go to the nearest hospital.",
    };
  }
  if (URGENT_SYMPTOMS.some((s) => lower.includes(s))) {
    return {
      level: "urgent",
      label: "See a doctor today",
      advice: "Book a consultation as soon as possible. If symptoms worsen suddenly, raise an SOS instead.",
    };
  }
  if (lower.trim().length === 0) {
    return null;
  }
  return {
    level: "routine",
    label: "Routine consultation advised",
    advice: "These symptoms don't match urgent warning signs, but a doctor's consultation is still recommended if they persist or worsen.",
  };
}
const dispatchStatusText = {
  pending: "Request received",
  searching_ambulance: "Finding nearest ambulance",
  vehicle_assigned: "Ambulance assigned",
  dispatched: "Ambulance dispatched",
  en_route: "Ambulance en route",
  arrived: "Ambulance arrived",
  at_hospital: "At hospital",
  handed_over: "Handed over to hospital",
  cancelled: "Cancelled",
  closed: "Resolved",
};

export default function PatientDashboard({ session, onLogout }) {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [language, setLanguage] = useState(
    () => localStorage.getItem("patient-language") || "English",
  );
  const [flow, setFlow] = useState(null);
  const [call, setCall] = useState(null);
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      text: "Welcome to Nabha Care. Your account is ready.",
      read: false,
    },
    { id: 2, text: "Keep your contact number up to date.", read: false },
  ]);
  const [locationShared, setLocationShared] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [symptomCheckerOpen, setSymptomCheckerOpen] = useState(false);
  const t = labels[language];
  const unread = notifications.filter((item) => !item.read).length;
  async function load() {
    setError("");
    if (!navigator.onLine) {
      const cached = await loadSnapshot("patient-dashboard");
      if (cached) {
        setData(cached.data);
        setMessage(`Showing saved records from ${new Date(cached.savedAt).toLocaleString()} — you're offline.`);
        return;
      }
    }
    try {
      const [profile, doctors, appointments, consultations] = await Promise.all(
        [
          "/api/portal/patient/profile",
          "/api/portal/patient/doctors",
          "/api/portal/patient/appointments",
          "/api/portal/patient/consultations",
        ].map((path) => api(path, session.token)),
      );
      const fresh = { profile, doctors, appointments, consultations };
      setData(fresh);
      saveSnapshot("patient-dashboard", fresh);
    } catch (err) {
      if (/token|unauthor|expired/i.test(err.message)) {
        onLogout();
        return;
      }
      const cached = await loadSnapshot("patient-dashboard");
      if (cached) {
        setData(cached.data);
        setMessage(`Could not reach the server — showing saved records from ${new Date(cached.savedAt).toLocaleString()}.`);
      } else {
        setError(err.message);
      }
    }
    loadEmergencies();
  }
  async function syncOfflineQueue() {
    const results = await flushQueue(async (item) => {
      await api(item.path, session.token, { method: item.method, body: JSON.stringify(item.body) });
    });
    const succeeded = results.filter((r) => r.ok).length;
    if (succeeded > 0) {
      setMessage(`Synced ${succeeded} request${succeeded > 1 ? "s" : ""} saved while you were offline.`);
      load();
    }
  }
  async function loadEmergencies() {
    try {
      setEmergencies(await api("/api/emergencies", session.token));
    } catch {
      // non-fatal — emergency history is supplementary to the main dashboard
    }
  }
  async function raiseEmergency({ emergencyType, severity, details }) {
    if (!navigator.geolocation) {
      setMessage("Location is required to raise an emergency on this device.");
      return;
    }
    setSosLoading(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true }),
      );
      await api("/api/emergencies", session.token, {
        method: "POST",
        body: JSON.stringify({
          emergencyType,
          severity,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          title: `${severity.toUpperCase()} emergency`,
          details,
        }),
      });
      setSosOpen(false);
      setMessage("Emergency raised. Help has been alerted with your location.");
      loadEmergencies();
    } catch (err) {
      setMessage("Could not raise emergency: " + (err.message || "Location permission denied"));
    }
    setSosLoading(false);
  }
  useEffect(() => {
    load();
    const online = () => {
      setOffline(false);
      syncOfflineQueue();
    };
    const offlineEvent = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineEvent);
    };
  }, []);
  const upcoming = useMemo(
    () =>
      data?.appointments?.find(
        (item) => !["completed", "cancelled"].includes(item.status),
      ) || null,
    [data],
  );
  function openFlow(doctor = null) {
    setFlow({
      step: 1,
      doctor,
      symptoms: "",
      consent: false,
      camera: true,
      microphone: true,
      network: "hd",
    });
  }
  async function confirmBooking() {
    if (!flow.doctor) {
      setMessage("Please choose a doctor before joining the queue.");
      setFlow({ ...flow, step: 1 });
      return;
    }
    const payload = {
      doctorId: flow.doctor.id,
      date: new Date().toISOString().slice(0, 10),
      time: "10:30",
      reason: flow.symptoms,
      appointmentType: flow.network === "audio_only" ? "audio" : "video",
    };
    if (!navigator.onLine) {
      await queueRequest({ path: "/api/portal/patient/appointments", method: "POST", body: payload });
      setMessage("You're offline — your booking request has been saved and will be sent automatically once you're back online.");
      setFlow(null);
      return;
    }
    try {
      await api("/api/portal/patient/appointments", session.token, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage(
        "Your consultation request has been added to the doctor queue.",
      );
      setNotifications((items) => [
        {
          id: Date.now(),
          text: "Consultation request submitted. We will notify you when the doctor is ready.",
          read: false,
        },
        ...items,
      ]);
      setFlow(null);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }
  if (!data && !error)
    return <div className="patient-loading">{t.loading}</div>;
  if (error)
    return (
      <div className="patient-loading">
        <h2>We could not load your dashboard</h2>
        <p>{error}</p>
        <button className="button button-green" onClick={load}>
          Try again
        </button>
        <button className="button button-outline" onClick={onLogout}>
          {t.signOut}
        </button>
      </div>
    );
  const nav = [
    ["home", t.home],
    ["start", t.start],
    ["consultations", t.consultations],
    ["prescriptions", t.prescriptions],
    ["reports", t.reports],
    ["hospitals", t.hospitals],
    ["medicines", t.medicines],
    ["emergency", t.emergency],
    ["profile", t.profile],
    ["help", t.help],
  ];

  async function shareLocation() {
    setLocationLoading(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude, accuracy } = pos.coords;
      setUserCoords({ lat: latitude, lng: longitude });
      // Find an active consultation to attach the location to
      const activeConsult = data?.consultations?.find((c) => c.status === "active");
      if (activeConsult) {
        await api("/api/portal/patient/location", session.token, {
          method: "POST",
          body: JSON.stringify({
            consultationId: activeConsult._id,
            latitude,
            longitude,
            accuracyMeters: accuracy,
            consent: true,
          }),
        });
      }
      setLocationShared(true);
      setMessage("Location shared with your doctor!");
    } catch (e) {
      setMessage("Could not get your location: " + (e.message || "Permission denied"));
    }
    setLocationLoading(false);
  }

  async function loadNearbyHospitals() {
    setHospitalsLoading(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      setUserCoords({ lat: latitude, lng: longitude });
      const result = await api(
        `/api/portal/patient/hospitals/nearby?lat=${latitude}&lng=${longitude}&radius=30`,
        session.token,
      );
      setHospitals(result);
    } catch (e) {
      setMessage("Could not load hospitals: " + (e.message || "Location denied"));
    }
    setHospitalsLoading(false);
  }
  return (
    <div className="patient-app">
      <header className="patient-header">
        <a href="/" className="brand">
          <span className="brand-mark">✚</span>
          <span>
            Nabha Care<small>Patient portal</small>
          </span>
        </a>
        <div className="patient-tools">
          <span
            className={offline ? "offline-pill is-offline" : "offline-pill"}
          >
            {offline ? "Offline — saved items pending" : "● Connected"}
          </span>
          <select
            aria-label="Choose language"
            value={language}
            onChange={(event) => {
              setLanguage(event.target.value);
              localStorage.setItem("patient-language", event.target.value);
            }}
          >
            <option>English</option>
            <option>Hindi</option>
            <option>Punjabi</option>
          </select>
          <button
            className="notification-button"
            onClick={() => {
              setNotifications((items) =>
                items.map((item) => ({ ...item, read: true })),
              );
              setTab("home");
            }}
            aria-label={`${unread} unread notifications`}
          >
            {t.notifications} ({unread})
          </button>
          <button className="button button-sos" onClick={() => setSosOpen(true)}>
            ⚠ SOS
          </button>
          <button className="button button-dark" onClick={onLogout}>
            {t.signOut}
          </button>
        </div>
      </header>
      <div className="patient-layout">
        <aside className="patient-nav">
          <div className="patient-summary">
            <span className="avatar">
              {data.profile.name?.charAt(0) || "P"}
            </span>
            <b>{data.profile.name}</b>
            <small>{data.profile.facility || "Nabha Care patient"}</small>
          </div>
          {nav.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </aside>
        <main className="patient-main">
          {offline && (
            <div className="offline-alert">
              <b>Limited connection</b>
              <span>
                Your saved requests have not been sent yet. Reconnect to sync
                them safely.
              </span>
            </div>
          )}
          {tab === "home" && (
            <HomeView
              t={t}
              profile={data.profile}
              upcoming={upcoming}
              consultations={data.consultations}
              notifications={notifications}
              onStart={() => openFlow()}
              onTab={setTab}
              onJoin={() => setCall(upcoming)}
            />
          )}
          {tab === "start" && (
            <StartView doctors={data.doctors} onStart={openFlow} />
          )}
          {tab === "consultations" && (
            <ConsultationsView
              appointments={data.appointments}
              consultations={data.consultations}
              onJoin={setCall}
            />
          )}
          {tab === "prescriptions" && (
            <PrescriptionsView consultations={data.consultations} doctors={data.doctors} profile={data.profile} />
          )}
          {tab === "reports" && <ReportsView />}
          {tab === "profile" && (
            <ProfileView
              profile={data.profile}
              language={language}
              onSaved={() =>
                setMessage(
                  "Your demo profile settings were saved on this device.",
                )
              }
            />
          )}
          {tab === "hospitals" && (
            <HospitalsView
              session={session}
              userCoords={userCoords}
              setUserCoords={setUserCoords}
              hospitals={hospitals}
              setHospitals={setHospitals}
              hospitalsLoading={hospitalsLoading}
              setHospitalsLoading={setHospitalsLoading}
              selectedHospital={selectedHospital}
              setSelectedHospital={setSelectedHospital}
              locationShared={locationShared}
              locationLoading={locationLoading}
              consultations={data.consultations}
              onShareLocation={shareLocation}
              onMessage={setMessage}
            />
          )}
          {tab === "medicines" && <MedicinesView session={session} onMessage={setMessage} />}
          {tab === "emergency" && (
            <EmergencyView emergencies={emergencies} onRaise={() => setSosOpen(true)} />
          )}
          {tab === "help" && (
            <HelpView
              onStart={() => openFlow()}
              onSos={() => setSosOpen(true)}
              onSymptomChecker={() => setSymptomCheckerOpen(true)}
            />
          )}
        </main>
      </div>
      {sosOpen && (
        <SosModal
          loading={sosLoading}
          onCancel={() => setSosOpen(false)}
          onSubmit={raiseEmergency}
        />
      )}
      {symptomCheckerOpen && (
        <SymptomCheckerModal onClose={() => setSymptomCheckerOpen(false)} onSos={() => { setSymptomCheckerOpen(false); setSosOpen(true); }} onStart={() => { setSymptomCheckerOpen(false); openFlow(); }} />
      )}
      {flow && (
        <ConsultationFlow
          flow={flow}
          setFlow={setFlow}
          doctors={data.doctors}
          onConfirm={confirmBooking}
        />
      )}
      {call && (
        <LiveConsultation
          session={session}
          appointment={call}
          role="patient"
          onClose={() => {
            setCall(null);
            setMessage(
              "Consultation ended. Your doctor’s advice will appear in your history once saved.",
            );
          }}
        />
      )}
      {message && (
        <div className="patient-toast" role="status">
          {message}
          <button onClick={() => setMessage("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function HomeView({
  t,
  profile,
  upcoming,
  consultations,
  notifications,
  onStart,
  onTab,
  onJoin,
}) {
  return (
    <>
      <section className="patient-welcome">
        <div>
          <p className="kicker">Your care dashboard</p>
          <h1>{t.welcome}, {profile.name?.split(" ")[0] || "there"}.</h1>
          <p>{t.welcomeSub}</p>
          <button className="button button-green" onClick={onStart}>
            {t.startCta} →
          </button>
        </div>
        <div className="care-status">
          <span>{t.careStatus}</span>
          <b>
            {upcoming ? statusText(upcoming.status) : "No appointment waiting"}
          </b>
          <small>
            {upcoming
              ? `${upcoming.doctor?.name || "Doctor"} · ${upcoming.time || "Time to be confirmed"}`
              : "Find a doctor when you need support."}
          </small>
          {upcoming && (
            <button className="button button-soft" onClick={onJoin}>
              Open waiting room
            </button>
          )}
        </div>
      </section>
      <section className="patient-quick">
        <button onClick={() => onTab("start")}>
          <span>{t.findDoctor}</span>
        </button>
        <button onClick={onStart}>
          ＋<span>Book appointment</span>
        </button>
        <button onClick={() => onTab("prescriptions")}>
          ▤<span>{t.prescriptions}</span>
        </button>
        <button onClick={() => onTab("reports")}>
          ▣<span>{t.reports}</span>
        </button>
      </section>
      <section className="patient-content-grid">
        <article className="patient-card">
          <div className="patient-card-head">
            <h2>{t.upcomingCare}</h2>
            <button onClick={() => onTab("consultations")}>{t.viewAll}</button>
          </div>
          {upcoming ? (
            <div className="appointment-card">
              <span className="badge">{statusText(upcoming.status)}</span>
              <h3>{upcoming.doctor?.name || "Doctor assigned soon"}</h3>
              <p>
                {upcoming.doctor?.specialization || "Video consultation"} ·{" "}
                {upcoming.date
                  ? new Date(upcoming.date).toLocaleDateString()
                  : "Date pending"}{" "}
                {upcoming.time && `at ${upcoming.time}`}
              </p>
              <button className="button button-green" onClick={onJoin}>
                Join waiting room
              </button>
            </div>
          ) : (
            <EmptyState
              icon="◷"
              title="No appointment yet"
              text="Find a doctor and book a time that works for you."
              action="Find a doctor"
              onAction={() => onTab("start")}
            />
          )}
        </article>
        <article className="patient-card">
          <div className="patient-card-head">
            <h2>{t.recentCare}</h2>
            <button onClick={() => onTab("consultations")}>{t.viewAll}</button>
          </div>
          {consultations?.length ? (
            consultations.slice(0, 2).map((item) => (
              <div className="care-list" key={item._id}>
                <b>{item.assessment || "Consultation update"}</b>
                <span>
                  {item.advice ||
                    item.symptoms ||
                    "Your care notes will appear here."}
                </span>
                <small>
                  {item.status || "Completed"} · Follow-up:{" "}
                  {item.followUpDate || "Ask your doctor"}
                </small>
              </div>
            ))
          ) : (
            <EmptyState
              icon="P"
              title="Your care history is empty"
              text="Completed consultation notes and follow-ups will appear here."
            />
          )}
        </article>
        <article className="patient-card">
          <div className="patient-card-head">
            <h2>{t.notifications}</h2>
            <span>{notifications.filter((item) => !item.read).length} new</span>
          </div>
          {notifications.map((item) => (
            <div
              className={`notice ${item.read ? "" : "unread"}`}
              key={item.id}
            >
              {item.text}
            </div>
          ))}
        </article>
      </section>
    </>
  );
}
function StartView({ doctors, onStart }) {
  const [search, setSearch] = useState("");
  const filtered = doctors.filter((doctor) =>
    `${doctor.name} ${doctor.specialization}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <section>
      <div className="page-heading">
        <p className="kicker">Book a consultation</p>
        <h1>Find the right doctor</h1>
        <p>
          Choose a doctor and complete a short, private consultation request.
        </p>
      </div>
      <input
        className="doctor-search"
        placeholder="Search by doctor name or specialty"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />{" "}
      <div className="doctor-grid">
        {filtered.map((doctor) => (
          <article className="doctor-card" key={doctor.id}>
            <span className="doctor-avatar">
              {doctor.name?.charAt(0) || "D"}
            </span>
            <div>
              <h3>{doctor.name}</h3>
              <p>{doctor.specialization || "General medicine"}</p>
              <small>● Available for video or audio consultation</small>
            </div>
            <button
              className="button button-green"
              onClick={() => onStart(doctor)}
            >
              Continue
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
function ConsultationsView({ appointments, consultations, onJoin }) {
  return (
    <section>
      <div className="page-heading">
        <p className="kicker">Your timeline</p>
        <h1>My consultations</h1>
      </div>
      <div className="patient-card">
        {appointments.length ? (
          appointments.map((item) => (
            <div className="consultation-row" key={item._id}>
              <div>
                <span className="badge">{statusText(item.status)}</span>
                <h3>{item.doctor?.name || "Doctor"}</h3>
                <p>
                  {item.reason || "Video consultation"} ·{" "}
                  {item.date
                    ? new Date(item.date).toLocaleDateString()
                    : "Date pending"}{" "}
                  {item.time && `at ${item.time}`}
                </p>
              </div>
              {!["completed", "cancelled"].includes(item.status) && (
                <button
                  className="button button-green"
                  onClick={() => onJoin(item)}
                >
                  Waiting room
                </button>
              )}
            </div>
          ))
        ) : (
          <EmptyState
            icon="◷"
            title="No consultations yet"
            text="Your appointment history will appear here."
          />
        )}
      </div>
      {consultations.length > 0 && (
        <div className="patient-card">
          <h2>Completed consultations</h2>
          {consultations.map((item) => (
            <div className="consultation-row" key={item._id}>
              <div>
                <h3>{item.assessment || "Clinical consultation"}</h3>
                <p>{item.advice || item.symptoms || "No notes available"}</p>
              </div>
              <span className="badge">{item.outcome || "Completed"}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
function PrescriptionsView({ consultations, doctors, profile }) {
  const doctorMap = new Map((doctors || []).map((d) => [String(d.id), d]));
  async function downloadPdf(item) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const doctor = doctorMap.get(String(item.doctorId));
    let y = 20;
    doc.setFontSize(16);
    doc.text("Nabha Care — Prescription", 14, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Date: ${new Date(item.updatedAt || item.createdAt).toLocaleDateString()}`, 14, y);
    y += 8;
    doc.text(`Patient: ${profile?.name || "—"}`, 14, y);
    y += 8;
    doc.text(`Doctor: ${doctor?.name || "—"}${doctor?.specialization ? ` (${doctor.specialization})` : ""}`, 14, y);
    y += 12;
    doc.setFontSize(13);
    doc.text("Diagnosis / assessment", 14, y);
    y += 7;
    doc.setFontSize(11);
    y = writeWrapped(doc, item.assessment || "—", y);
    y += 6;
    doc.setFontSize(13);
    doc.text("Prescription", 14, y);
    y += 7;
    doc.setFontSize(11);
    y = writeWrapped(doc, item.prescription || "—", y);
    y += 6;
    doc.setFontSize(13);
    doc.text("Advice", 14, y);
    y += 7;
    doc.setFontSize(11);
    writeWrapped(doc, item.advice || "Follow the instructions provided by your doctor.", y);
    doc.save(`prescription-${new Date(item.updatedAt || item.createdAt).toISOString().slice(0, 10)}.pdf`);
  }
  function writeWrapped(doc, text, startY) {
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 14, startY);
    return startY + lines.length * 6;
  }
  return (
    <section>
      <div className="page-heading">
        <p className="kicker">Your medicine plan</p>
        <h1>Prescriptions</h1>
        <p>Only prescriptions published by your doctor appear here.</p>
      </div>
      {consultations.some((item) => item.prescription) ? (
        consultations
          .filter((item) => item.prescription)
          .map((item) => (
            <article className="prescription-card" key={item._id}>
              <span className="badge">Published</span>
              <h2>Doctor prescription</h2>
              <p>{item.prescription}</p>
              <small>
                Advice:{" "}
                {item.advice ||
                  "Follow the instructions provided by your doctor."}
              </small>
              <div className="actions">
                <button
                  className="button button-soft"
                  onClick={() => window.print()}
                >
                  Print / save
                </button>
                <button
                  className="button button-green"
                  onClick={() => downloadPdf(item)}
                >
                  Download PDF
                </button>
              </div>
            </article>
          ))
      ) : (
        <EmptyState
          icon="▤"
          title="No prescription published"
          text="Your doctor’s medicine instructions will appear here after a completed consultation."
        />
      )}
    </section>
  );
}
function ReportsView() {
  return (
    <section>
      <div className="page-heading">
        <p className="kicker">Medical documents</p>
        <h1>Lab reports</h1>
        <p>Uploaded reports will be available privately in this area.</p>
      </div>
      <EmptyState
        icon="▣"
        title="No lab reports available"
        text="When a laboratory publishes a report for you, you will see it here and receive a notification."
      />
    </section>
  );
}
// ─── HospitalsView — Live Leaflet map + nearby hospitals ──────────────────────
function HospitalsView({ session, userCoords, setUserCoords, hospitals, setHospitals, hospitalsLoading, setHospitalsLoading, selectedHospital, setSelectedHospital, locationShared, locationLoading, onShareLocation, onMessage }) {
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const hasFetched = useRef(false);

  async function fetchHospitals(lat, lng) {
    setHospitalsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/portal/patient/hospitals/nearby?lat=${lat}&lng=${lng}&radius=30`, { headers: { Authorization: `Bearer ${session.token}` } });
      const body = await res.json().catch(() => ({}));
      setHospitals(body.data || []);
    } catch { onMessage("Could not load nearby hospitals."); }
    setHospitalsLoading(false);
  }

  function handleLocate() {
    if (!navigator.geolocation) { onMessage("GPS not supported on this device."); return; }
    setHospitalsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { const { latitude: lat, longitude: lng } = pos.coords; setUserCoords({ lat, lng }); fetchHospitals(lat, lng); },
      (err) => { setHospitalsLoading(false); onMessage("Location error: " + (err.message || "Permission denied")); },
      { timeout: 12000, enableHighAccuracy: true }
    );
  }

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    if (userCoords) fetchHospitals(userCoords.lat, userCoords.lng);
    else handleLocate();
  }, []);

  const mapMarkers = [
    ...(userCoords ? [{ id: "user", lat: userCoords.lat, lng: userCoords.lng, popup: "<b>Your Location</b>" }] : []),
    ...hospitals.map((h) => ({ id: h._id, lat: h.latitude, lng: h.longitude, popup: `<b>${h.name}</b><br>${h.type?.toUpperCase()}<br>${h.distanceKm} km<br>Contact: ${h.contact || "N/A"}` })),
  ];
  const mapCenter = selectedHospital ? [selectedHospital.latitude, selectedHospital.longitude] : userCoords ? [userCoords.lat, userCoords.lng] : undefined;
  const typeLabel = (t) => ({ district: "District Hospital", phc: "Primary Health Centre (PHC)", chc: "Community Health Centre (CHC)", private: "Private Hospital" }[t] || t || "Hospital");

  return (
    <section style={{ animation: "fadeInUp .28s ease" }}>
      <div className="hosp-page-header">
        <div>
          <p className="kicker">Healthcare access</p>
          <h1 style={{ margin: "0 0 6px", color: "#0d2f30", font: "700 28px/1.1 'Space Grotesk',sans-serif" }}>
            Nearby Hospitals &amp; Health Centres
          </h1>
          <p style={{ margin: 0, color: "#617476", fontSize: 14 }}>Government hospitals, PHCs, and CHCs near your current location</p>
        </div>
        <button className="button button-soft" onClick={handleLocate}>Refresh Location</button>
      </div>

      {locationShared
        ? <div className="loc-shared-note"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>GPS location shared with your doctor</div>
        : <button className="loc-btn" onClick={onShareLocation} disabled={locationLoading}>{locationLoading ? <span className="loc-spinner" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}{locationLoading ? "Fetching GPS…" : "Share My Location with Doctor"}</button>
      }

      <div className="hosp-map-wrap">
        {hospitalsLoading && !hospitals.length
          ? <div style={{ height: 380, display: "grid", placeContent: "center", color: "#617476", gap: 12, background: "#f5f8f5", borderRadius: 12 }}><div style={{ width: 36, height: 36, border: "3px solid #dce7e0", borderTopColor: "#0c6c56", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto" }} /><span style={{ textAlign: "center" }}>Detecting location…</span></div>
          : mapMarkers.length
            ? <LeafletMap markers={mapMarkers} center={mapCenter} zoom={userCoords ? 13 : 12} height="400px" onHospitalClick={(id) => { const h = hospitals.find((x) => x._id === id); if (h) setSelectedHospital(h); }} />
            : <div style={{ height: 300, display: "grid", placeContent: "center", color: "#617476", gap: 14, background: "#f5f8f5", borderRadius: 12, textAlign: "center" }}><p>Enable GPS to see hospitals on the map</p><button className="button button-green" onClick={handleLocate}>Enable GPS Location</button></div>
        }
      </div>

      {hospitals.length > 0 && (
        <div className="hosp-list" style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 14px", color: "#0d2f30", font: "700 16px 'Space Grotesk',sans-serif" }}>{hospitals.length} Health {hospitals.length === 1 ? "Facility" : "Facilities"} Found</h3>
          {hospitals.map((h, i) => (
            <div key={h._id} className={`hosp-card ${selectedHospital?._id === h._id ? "selected" : ""}`} style={{ animationDelay: `${i * 0.05}s`, animation: "fadeInUp .25s ease both" }} onClick={() => setSelectedHospital(selectedHospital?._id === h._id ? null : h)}>
              <div className="hosp-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0c6c56" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg></div>
              <div className="hosp-meta">
                <b>{h.name}</b>
                <span className={`hosp-type-badge ${h.type || ""}`}>{typeLabel(h.type)}</span>
                {h.address && <small>{h.address}</small>}
                {h.contact && <small>Contact: {h.contact}</small>}
                {h.beds && <small>Beds: {h.beds}</small>}
                {h.facilities?.length > 0 && <div className="hosp-facilities">{h.facilities.slice(0, 5).map((f) => <span key={f} className="hosp-facility-chip">{f}</span>)}</div>}
                {h.doctors?.length > 0 && <div className="hosp-doctors">Doctors: {h.doctors.slice(0, 3).map((d) => d.name || "Doctor").join(", ")}{h.doctors.length > 3 ? ` +${h.doctors.length - 3} more` : ""}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <span className="hosp-dist">{h.distanceKm} km</span>
                {h.contact && <a href={`tel:${h.contact}`} className="button button-soft" style={{ padding: "6px 14px", fontSize: 12, textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>Call</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hospitalsLoading && hospitals.length === 0 && userCoords && (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#617476", background: "white", borderRadius: 14, border: "1px solid #dce7e0", marginTop: 16 }}>
          <p style={{ margin: "0 0 14px" }}>No hospitals found within 30 km of your location.</p>
          <button className="button button-outline" onClick={handleLocate}>Search Again</button>
        </div>
      )}
    </section>
  );
}

function ProfileView({ profile, language, onSaved }) {

  const [saved, setSaved] = useState(false);
  return (
    <section>
      <div className="page-heading">
        <p className="kicker">Personal settings</p>
        <h1>Profile and privacy</h1>
      </div>
      <form
        className="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
          onSaved();
        }}
      >
        <label>
          Full name
          <input defaultValue={profile.name || ""} required />
        </label>
        <label>
          Phone number
          <input defaultValue={profile.contact || ""} />
        </label>
        <label>
          Facility / village
          <input
            defaultValue={profile.facility || ""}
            placeholder="Your village or preferred health centre"
          />
        </label>
        <label>
          Language preference
          <select defaultValue={language}>
            <option>English</option>
            <option>Hindi</option>
            <option>Punjabi</option>
          </select>
        </label>
        <label className="consent-check">
          <input type="checkbox" defaultChecked /> I consent to use Nabha Care
          for my consultations.
        </label>
        <button className="button button-green">Save profile</button>
        {saved && <p className="success-note">Saved in this demo session.</p>}
      </form>
      <article className="security-note">
        <h3>Account security</h3>
        <p>
          To change a password or recover access, contact the configured Nabha
          Care helpdesk. Production session management and recovery will be
          connected to the secured backend.
        </p>
      </article>
    </section>
  );
}
function HelpView({ onStart, onSos, onSymptomChecker }) {
  return (
    <section>
      <div className="page-heading">
        <p className="kicker">Need support?</p>
        <h1>Help and safety</h1>
      </div>
      <div className="help-grid">
        <article>
          <h3>Consultation support</h3>
          <p>
            If you cannot connect, try audio-only mode or ask an ASHA worker to
            help you.
          </p>
          <button className="button button-green" onClick={onStart}>
            Start consultation
          </button>
        </article>
        <article>
          <h3>Emergency support</h3>
          <p>
            Raise an SOS and your location is sent to hospital staff, who
            dispatch the nearest available ambulance.
          </p>
          <button className="button button-sos" onClick={onSos}>
            ⚠ Raise SOS
          </button>
        </article>
        <article>
          <h3>Symptom checker</h3>
          <p>
            A simple, rule-based checker that flags urgent warning signs —
            it does not diagnose, and is not a substitute for a doctor.
          </p>
          <button className="button button-soft" onClick={onSymptomChecker}>
            Check my symptoms
          </button>
        </article>
      </div>
    </section>
  );
}
function MedicinesView({ session, onMessage }) {
  const [query, setQuery] = useState("");
  const [medicines, setMedicines] = useState(null);

  useEffect(() => {
    api("/api/medicines", session.token)
      .then(setMedicines)
      .catch((err) => onMessage("Could not load medicine availability: " + err.message));
  }, []);

  const filtered = (medicines || []).filter((m) =>
    `${m.name} ${m.hospital?.name || ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section>
      <div className="page-heading">
        <p className="kicker">Pharmacy stock</p>
        <h1>Medicine availability</h1>
        <p>Check whether a medicine is currently in stock at nearby hospitals before you travel.</p>
      </div>
      <input
        className="doctor-search"
        placeholder="Search medicine by name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {medicines === null ? (
        <p className="empty">Loading stock information…</p>
      ) : filtered.length ? (
        <div className="patient-card">
          {filtered.map((m) => (
            <div className="consultation-row" key={m._id}>
              <div>
                <b>{m.name}</b>
                <p>{m.hospital?.name || "Hospital"} · {m.category || "General"}</p>
              </div>
              <span className={`badge ${m.stockQuantity <= m.lowStockThreshold ? "badge-low" : ""}`}>
                {m.stockQuantity > 0
                  ? `${m.stockQuantity} ${m.unit} in stock${m.stockQuantity <= m.lowStockThreshold ? " (low)" : ""}`
                  : "Out of stock"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="▤" title="No stock records found" text="Try a different medicine name." />
      )}
    </section>
  );
}
function EmergencyView({ emergencies, onRaise }) {
  return (
    <section>
      <div className="page-heading">
        <p className="kicker">Safety</p>
        <h1>Emergency</h1>
        <p>Raise an SOS with your live location if you need urgent help.</p>
      </div>
      <div className="patient-card">
        <button className="button button-sos button-sos-large" onClick={onRaise}>
          ⚠ Raise Emergency (SOS)
        </button>
      </div>
      <div className="patient-card">
        <h2>Your emergency history</h2>
        {emergencies.length ? (
          emergencies.map((item) => (
            <div className="consultation-row" key={item._id}>
              <div>
                <span className="badge">{dispatchStatusText[item.dispatchStatus] || item.dispatchStatus}</span>
                <h3>{item.title || item.emergencyType}</h3>
                <p>{item.details || "No additional details provided."}</p>
                {item.assignedVehicle && (
                  <small>
                    Ambulance: {item.assignedVehicle.vehicleNumber}
                    {item.assignedVehicle.driver ? ` · Driver: ${item.assignedVehicle.driver.name} (${item.assignedVehicle.driver.phone})` : ""}
                  </small>
                )}
              </div>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </div>
          ))
        ) : (
          <EmptyState
            icon="⚠"
            title="No emergencies raised"
            text="If you ever need urgent help, use the SOS button above or in the header."
          />
        )}
      </div>
    </section>
  );
}
function SymptomCheckerModal({ onClose, onSos, onStart }) {
  const [text, setText] = useState("");
  const result = checkSymptoms(text);
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-label="Symptom checker">
        <h2>Symptom checker</h2>
        <p className="muted">
          Describe what you're experiencing in your own words. This is a
          simple keyword-based screen for urgent warning signs — it does not
          diagnose and does not replace a doctor's assessment.
        </p>
        <label>
          Your symptoms
          <textarea
            rows="4"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. fever and cough for two days"
            autoFocus
          />
        </label>
        {result && (
          <div className={`symptom-result symptom-${result.level}`}>
            <b>{result.label}</b>
            <p>{result.advice}</p>
          </div>
        )}
        <div className="actions">
          {result?.level === "emergency" ? (
            <button className="button button-sos" onClick={onSos}>⚠ Raise SOS</button>
          ) : (
            <button className="button button-green" onClick={onStart}>Book a consultation</button>
          )}
          <button type="button" className="button button-soft" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}
function SosModal({ loading, onCancel, onSubmit }) {
  const [emergencyType, setEmergencyType] = useState("medical");
  const [severity, setSeverity] = useState("high");
  const [details, setDetails] = useState("");
  return (
    <div className="modal-backdrop">
      <form
        className="modal form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ emergencyType, severity, details });
        }}
      >
        <h2>⚠ Raise Emergency</h2>
        <p className="muted">
          Your current location will be shared with hospital staff so they can
          dispatch help. Only use this for a genuine emergency.
        </p>
        <label>
          Type of emergency
          <select value={emergencyType} onChange={(e) => setEmergencyType(e.target.value)}>
            <option value="medical">Medical</option>
            <option value="trauma">Trauma / injury</option>
            <option value="accident">Accident</option>
            <option value="pregnancy">Pregnancy related</option>
            <option value="fire">Fire</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Severity
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="critical">Critical — life-threatening</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>
          What's happening?
          <textarea rows="3" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Briefly describe the emergency" />
        </label>
        <div className="actions">
          <button className="button button-sos" disabled={loading}>
            {loading ? "Sending location…" : "Confirm & send location"}
          </button>
          <button type="button" className="button button-soft" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
function ConsultationFlow({ flow, setFlow, doctors, onConfirm }) {
  const doctor = flow.doctor;
  const update = (values) => setFlow({ ...flow, ...values });
  const steps = ["Doctor", "Symptoms", "Consent", "Device check", "Network"];
  return (
    <div className="modal-backdrop">
      <section
        className="consultation-flow"
        role="dialog"
        aria-modal="true"
        aria-label="Start consultation"
      >
        <div className="flow-progress">
          {steps.map((name, index) => (
            <span className={flow.step >= index + 1 ? "done" : ""} key={name}>
              {index + 1}
              <small>{name}</small>
            </span>
          ))}
        </div>
        {flow.step === 1 && (
          <>
            <p className="kicker">Step 1 of 5</p>
            <h2>
              {doctor ? `Consult with ${doctor.name}` : "Choose a doctor first"}
            </h2>
            <p>
              {doctor
                ? `${doctor.specialization || "General medicine"} · Video or audio consultation`
                : "Go to Find a doctor and select a clinician to continue."}
            </p>
          </>
        )}
        {flow.step === 2 && (
          <>
            <p className="kicker">Step 2 of 5</p>
            <h2>What would you like help with?</h2>
            <label>
              Symptoms or reason for consultation
              <textarea
                value={flow.symptoms}
                onChange={(event) => update({ symptoms: event.target.value })}
                placeholder="Describe your symptoms in your own words"
                rows="4"
              />
            </label>
          </>
        )}
        {flow.step === 3 && (
          <>
            <p className="kicker">Step 3 of 5</p>
            <h2>Your privacy and consent</h2>
            <p>
              Your request and consultation information are shared only with
              your authorized care team. Do not use this service for a
              life-threatening emergency.
            </p>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={flow.consent}
                onChange={(event) => update({ consent: event.target.checked })}
              />{" "}
              I understand and consent to this consultation.
            </label>
          </>
        )}
        {flow.step === 4 && (
          <>
            <p className="kicker">Step 4 of 5</p>
            <h2>Check your device</h2>
            <div className="device-check">
              <button
                className={flow.microphone ? "ok" : ""}
                onClick={() => update({ microphone: !flow.microphone })}
              >
                Microphone {flow.microphone ? "ready" : "off"}
              </button>
              <button
                className={flow.camera ? "ok" : ""}
                onClick={() => update({ camera: !flow.camera })}
              >
                Camera {flow.camera ? "ready" : "off"}
              </button>
            </div>
            <p>
              Camera is optional. You can continue with audio if your camera is
              not available.
            </p>
          </>
        )}
        {flow.step === 5 && (
          <>
            <p className="kicker">Step 5 of 5</p>
            <h2>Choose the best connection mode</h2>
            <div className="network-options">
              {[
                ["hd", "Video + audio", "Best when your internet is stable"],
                [
                  "low_res",
                  "Low-resolution video",
                  "Keeps audio clear on weaker internet",
                ],
                [
                  "audio_only",
                  "Audio only",
                  "Works without a camera or strong video connection",
                ],
              ].map(([id, title, text]) => (
                <button
                  key={id}
                  className={flow.network === id ? "selected" : ""}
                  onClick={() => update({ network: id })}
                >
                  <b>{title}</b>
                  <small>{text}</small>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="flow-actions">
          <button
            className="button button-soft"
            onClick={() =>
              flow.step === 1 ? setFlow(null) : update({ step: flow.step - 1 })
            }
          >
            {flow.step === 1 ? "Cancel" : "Back"}
          </button>
          {flow.step < 5 ? (
            <button
              className="button button-green"
              disabled={
                (flow.step === 1 && !doctor) ||
                (flow.step === 3 && !flow.consent)
              }
              onClick={() => update({ step: flow.step + 1 })}
            >
              Continue
            </button>
          ) : (
            <button className="button button-green" onClick={onConfirm}>
              Join doctor queue
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
function CallScreen({ call, session, onClose }) {
  return (
    <LiveConsultation
      session={session}
      appointment={call}
      roomId={call?.roomId || call?._id || "demo-room"}
      role="patient"
      onClose={onClose}
      onEndCall={onClose}
    />
  );
}
function EmptyState({ icon, title, text, action, onAction }) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="button button-soft" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
