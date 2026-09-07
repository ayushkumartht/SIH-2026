import React, { useEffect, useMemo, useState } from "react";
import LiveConsultation from "./LiveConsultation";

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
    profile: "Profile",
    help: "Help",
  },
  Hindi: {
    home: "होम",
    start: "परामर्श शुरू करें",
    consultations: "मेरे परामर्श",
    prescriptions: "दवाइयाँ",
    reports: "रिपोर्ट",
    profile: "प्रोफ़ाइल",
    help: "सहायता",
  },
  Punjabi: {
    home: "ਹੋਮ",
    start: "ਸਲਾਹ ਸ਼ੁਰੂ ਕਰੋ",
    consultations: "ਮੇਰੀਆਂ ਸਲਾਹਾਂ",
    prescriptions: "ਦਵਾਈਆਂ",
    reports: "ਰਿਪੋਰਟਾਂ",
    profile: "ਪ੍ਰੋਫ਼ਾਈਲ",
    help: "ਮਦਦ",
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
  const t = labels[language];
  const unread = notifications.filter((item) => !item.read).length;
  async function load() {
    setError("");
    try {
      const [profile, doctors, appointments, consultations] = await Promise.all(
        [
          "/api/portal/patient/profile",
          "/api/portal/patient/doctors",
          "/api/portal/patient/appointments",
          "/api/portal/patient/consultations",
        ].map((path) => api(path, session.token)),
      );
      setData({ profile, doctors, appointments, consultations });
    } catch (err) {
      if (/token|unauthor|expired/i.test(err.message)) {
        onLogout();
        return;
      }
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
    const online = () => setOffline(false);
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
    try {
      await api("/api/portal/patient/appointments", session.token, {
        method: "POST",
        body: JSON.stringify({
          doctorId: flow.doctor.id,
          date: new Date().toISOString().slice(0, 10),
          time: "10:30",
          reason: flow.symptoms,
          appointmentType: flow.network === "audio_only" ? "audio" : "video",
        }),
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
    return <div className="patient-loading">Loading your care dashboard…</div>;
  if (error)
    return (
      <div className="patient-loading">
        <h2>We could not load your dashboard</h2>
        <p>{error}</p>
        <button className="button button-green" onClick={load}>
          Try again
        </button>
        <button className="button button-outline" onClick={onLogout}>
          Sign out
        </button>
      </div>
    );
  const nav = [
    ["home", t.home],
    ["start", t.start],
    ["consultations", t.consultations],
    ["prescriptions", t.prescriptions],
    ["reports", t.reports],
    ["profile", t.profile],
    ["help", t.help],
  ];
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
            🔔<b>{unread}</b>
          </button>
          <button className="button button-dark" onClick={onLogout}>
            Sign out
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
            <PrescriptionsView consultations={data.consultations} />
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
          {tab === "help" && <HelpView onStart={() => openFlow()} />}
        </main>
      </div>
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
          <h1>Hello, {profile.name?.split(" ")[0] || "there"}.</h1>
          <p>
            Start a new consultation or continue your existing care journey.
          </p>
          <button className="button button-green" onClick={onStart}>
            Start consultation →
          </button>
        </div>
        <div className="care-status">
          <span>Care status</span>
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
          👩‍⚕️<span>Find a doctor</span>
        </button>
        <button onClick={onStart}>
          ＋<span>Book appointment</span>
        </button>
        <button onClick={() => onTab("prescriptions")}>
          ▤<span>Prescriptions</span>
        </button>
        <button onClick={() => onTab("reports")}>
          ▣<span>Lab reports</span>
        </button>
      </section>
      <section className="patient-content-grid">
        <article className="patient-card">
          <div className="patient-card-head">
            <h2>Upcoming care</h2>
            <button onClick={() => onTab("consultations")}>View all</button>
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
            <h2>Recent care</h2>
            <button onClick={() => onTab("consultations")}>History</button>
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
              icon="♡"
              title="Your care history is empty"
              text="Completed consultation notes and follow-ups will appear here."
            />
          )}
        </article>
        <article className="patient-card">
          <div className="patient-card-head">
            <h2>Notifications</h2>
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
function PrescriptionsView({ consultations }) {
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
              <button
                className="button button-soft"
                onClick={() => window.print()}
              >
                Print / save
              </button>
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
function HelpView({ onStart }) {
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
            Emergency dispatch is not connected in this demo. For urgent danger,
            contact your local emergency service or nearest health facility.
          </p>
          <span className="planned-label">Separate service</span>
        </article>
        <article>
          <h3>Symptom checker</h3>
          <p>
            The AI symptom checker is planned. It will not provide medical
            advice until clinical safety review is completed.
          </p>
          <span className="planned-label">Planned</span>
        </article>
      </div>
    </section>
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
                🎙 Microphone {flow.microphone ? "ready" : "off"}
              </button>
              <button
                className={flow.camera ? "ok" : ""}
                onClick={() => update({ camera: !flow.camera })}
              >
                📷 Camera {flow.camera ? "ready" : "off"}
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
function CallScreen({ call, onClose }) {
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [quality, setQuality] = useState("HD video");
  const [vitals, setVitals] = useState(false);
  return (
    <div className="call-screen">
      <header>
        <div>
          <span className="live-dot">● Doctor connection ready</span>
          <h2>{call.doctor?.name || "Your doctor"}</h2>
          <p>{call.doctor?.specialization || "General medicine"}</p>
        </div>
        <select
          value={quality}
          onChange={(event) => setQuality(event.target.value)}
          aria-label="Demo network mode"
        >
          <option>HD video</option>
          <option>Low-resolution video</option>
          <option>Audio only</option>
          <option>Very poor — fallback</option>
        </select>
      </header>
      <main>
        <div className="remote-video">
          <span>Doctor video area</span>
          <div className="local-video">
            Your preview {camera ? "on" : "off"}
          </div>
        </div>
        <aside>
          <h3>Consultation details</h3>
          <p>
            <b>Connection:</b> {quality}
          </p>
          <p>
            Video adapts to your connection. Audio is kept on whenever possible.
          </p>
          {vitals ? (
            <p className="success-note">Vitals saved for doctor review.</p>
          ) : (
            <button
              className="button button-soft"
              onClick={() => setVitals(true)}
            >
              Submit demo vitals
            </button>
          )}
        </aside>
      </main>
      <footer>
        <button onClick={() => setMic(!mic)}>
          {mic ? "🎙 Mute" : "🎙 Unmute"}
        </button>
        <button onClick={() => setCamera(!camera)}>
          📷 {camera ? "Camera off" : "Camera on"}
        </button>
        <button onClick={() => setQuality("HD video")}>↻ Reconnect</button>
        <button className="end-call" onClick={onClose}>
          End consultation
        </button>
      </footer>
    </div>
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
