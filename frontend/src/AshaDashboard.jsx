import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import LiveConsultation from "./LiveConsultation";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

// Hand-rolled Leaflet wrapper (matches Doctor/Patient/Driver dashboards) instead
// of react-leaflet's <MapContainer> — react-leaflet is known to throw "Map
// container is already initialized" under React StrictMode's double-mount in
// dev, which this app runs under (see main.jsx). This guards against that.
function LeafletMap({ markers = [], center, zoom = 12, height = "480px" }) {
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
      const map = L.default.map(mapRef.current).setView(center || [30.37, 76.15], zoom);
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      instanceRef.current = { map, L: L.default, markers: [] };
      addMarkers(markers, instanceRef.current);
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
    addMarkers(markers, instanceRef.current);
    if (center) map.setView(center, zoom);
  }, [markers, center, zoom]);

  function addMarkers(list, ctx) {
    if (!ctx || !list.length) return;
    list.forEach((m, i) => {
      const icon = ctx.L.divIcon({
        className: "",
        html: `<div class="map-pin map-pin-gov" style="animation-delay:${Math.min(i, 8) * 55}ms"><span class="map-pin-glyph">\u{1FA7A}</span></div><div class="map-pin-label">${m.label || ""}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -32],
      });
      const marker = ctx.L.marker([m.lat, m.lng], { icon }).addTo(ctx.map);
      if (m.popup) marker.bindPopup(m.popup);
      ctx.markers.push(marker);
    });
  }

  return <div ref={mapRef} style={{ height, width: "100%", borderRadius: "12px", overflow: "hidden" }} />;
}

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || "Request failed");
  return body.data ?? body;
}

export default function AshaDashboard({ session, onLogout }) {
  const [data, setData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [tab, setTab] = useState("today");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeCall, setActiveCall] = useState(null);

  async function load() {
    setError("");
    try {
      const [dashboard, doctorList] = await Promise.all([
        request("/api/asha/dashboard", session.token),
        request("/api/asha/doctors", session.token).catch(() => []),
      ]);
      setData(dashboard);
      setDoctors(doctorList);
    } catch (err) {
      if (/token|unauthor|expired/i.test(err.message)) onLogout();
      else setError(err.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const patients = useMemo(
    () => (data?.patients || []).filter((p) => `${p.name} ${p.village} ${p.contact || ""}`.toLowerCase().includes(query.toLowerCase())),
    [data, query],
  );
  const patientById = useMemo(() => new Map((data?.patients || []).map((p) => [String(p.id), p])), [data]);

  async function savePatient(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await request("/api/asha/patients", session.token, {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          age: Number(form.get("age")),
          gender: form.get("gender"),
          contact: form.get("contact"),
          village: form.get("village"),
          history: form.get("history"),
          consent: form.get("consent") === "on",
        }),
      });
      setRegister(false);
      setMessage("Patient registered and available in your secure field list.");
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  function captureLocation(patient) {
    if (!navigator.geolocation) return setMessage("Location is unavailable in this browser.");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await request(`/api/asha/patients/${patient.id}/location`, session.token, {
            method: "PATCH",
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracyMeters: pos.coords.accuracy,
              consent: true,
            }),
          });
          setMessage(`Location saved for ${patient.name}.`);
          load();
        } catch (err) {
          setMessage(err.message);
        }
      },
      () => setMessage("Location permission was not granted."),
    );
  }

  function startCall(patient, doctorId) {
    const doctor = doctors.find((d) => d._id === doctorId);
    setSelected(null);
    setActiveCall({
      appointment: {
        patientId: patient.id,
        doctorId,
        reason: `ASHA-assisted teleconsultation for ${patient.name}`,
      },
      patientName: patient.name,
      doctorName: doctor?.name,
    });
  }

  function endCall() {
    setActiveCall(null);
    setMessage("Consultation ended. The doctor's notes will appear under Follow-ups once saved.");
    load();
  }

  if (!data && !error) return <div className="patient-loading">Loading ASHA field desk…</div>;
  if (error) {
    return (
      <div className="patient-loading">
        <h2>Unable to load field data</h2>
        <p>{error}</p>
        <button className="button button-green" onClick={load}>Try again</button>
      </div>
    );
  }

  const withLocation = patients.filter((p) => p.lastKnownLocation);
  const center = withLocation[0]?.lastKnownLocation
    ? [withLocation[0].lastKnownLocation.latitude, withLocation[0].lastKnownLocation.longitude]
    : [30.37, 76.15];

  return (
    <div className="asha-app">
      <header className="asha-header">
        <a href="/" className="brand">
          <span className="brand-mark">✚</span>
          <span>
            Nabha Care<small>ASHA field desk</small>
          </span>
        </a>
        <div>
          <span className="offline-pill">● Connected</span>
          <button className="button button-dark" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <div className="asha-layout">
        <aside>
          <div className="asha-person">
            <span className="avatar">{session.user?.name?.charAt(0) || "A"}</span>
            <b>{session.user?.name || "ASHA worker"}</b>
            <small>Field care coordinator</small>
          </div>
          {[
            ["today", "Today"],
            ["patients", "Patients"],
            ["map", "Patient map"],
            ["followups", "Follow-ups"],
            ["help", "Help"],
          ].map(([id, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </aside>
        <main>
          {tab === "today" && (
            <>
              <section className="asha-hero">
                <div>
                  <p className="kicker">Field coordination</p>
                  <h1>Namaste, {session.user?.name?.split(" ")[0] || "ASHA"}.</h1>
                  <p>You're not the doctor — you bring the patient to one. Register patients, connect them to an online doctor, and pass on what the doctor tells you.</p>
                </div>
                <button className="button button-green" onClick={() => setRegister(true)}>+ Register patient</button>
              </section>
              <section className="asha-stats">
                <article><b>{patients.length}</b><span>Patients in field list</span></article>
                <article><b>{data.consultations?.length || 0}</b><span>Assisted consultations</span></article>
                <article><b>{withLocation.length}</b><span>Consented locations</span></article>
                <article><b>{data.pendingSync || 0}</b><span>Pending sync</span></article>
              </section>
              <section className="asha-panel">
                <div className="panel-title">
                  <h2>Patient care queue</h2>
                  <button onClick={() => setTab("patients")}>View all</button>
                </div>
                {patients.length ? (
                  patients.slice(0, 5).map((patient) => (
                    <PatientRow key={patient.id} patient={patient} onSelect={setSelected} onLocation={captureLocation} />
                  ))
                ) : (
                  <Empty />
                )}
              </section>
            </>
          )}

          {tab === "patients" && (
            <section>
              <div className="asha-hero compact">
                <div>
                  <p className="kicker">Village registry</p>
                  <h1>Patients</h1>
                </div>
                <button className="button button-green" onClick={() => setRegister(true)}>+ Register patient</button>
              </div>
              <input className="doctor-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient by name, village or contact" />
              <section className="asha-panel">
                {patients.length ? (
                  patients.map((patient) => (
                    <PatientRow key={patient.id} patient={patient} onSelect={setSelected} onLocation={captureLocation} />
                  ))
                ) : (
                  <Empty />
                )}
              </section>
            </section>
          )}

          {tab === "map" && (
            <section>
              <div className="page-heading">
                <p className="kicker">Consent-based map</p>
                <h1>Patient locations</h1>
                <p>Only locations captured with the patient's permission are shown. They are not background-tracked.</p>
              </div>
              <div className="asha-map">
                <LeafletMap
                  center={center}
                  zoom={12}
                  height="480px"
                  markers={withLocation.map((patient) => ({
                    lat: patient.lastKnownLocation.latitude,
                    lng: patient.lastKnownLocation.longitude,
                    label: patient.name,
                    popup: `<b>${patient.name}</b><br>${patient.village || "Field location"}<br>Accuracy: ${Math.round(patient.lastKnownLocation.accuracyMeters || 0)}m`,
                  }))}
                />
              </div>
              {!withLocation.length && (
                <p className="map-empty">No patient location shared yet. Select a patient and use "Capture location" during an assisted visit.</p>
              )}
            </section>
          )}

          {tab === "followups" && (
            <section>
              <div className="page-heading">
                <p className="kicker">Continuity of care</p>
                <h1>Doctor's instructions</h1>
                <p>Whatever the doctor tells the patient during a consultation you joined shows up here — pass it on during your next visit.</p>
              </div>
              <section className="asha-panel">
                {data.consultations?.length ? (
                  data.consultations
                    .slice()
                    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
                    .map((consultation) => (
                      <ConsultationRow key={consultation._id} consultation={consultation} patient={patientById.get(String(consultation.patientId))} />
                    ))
                ) : (
                  <Empty text="No assisted consultations yet. Open a patient and start a doctor video consultation to begin." />
                )}
              </section>
            </section>
          )}

          {tab === "help" && (
            <section className="help-grid">
              <article>
                <h3>Connected care</h3>
                <p>Open a patient's record and tap "Start doctor video call" to connect them with an available doctor using your own device. You are not diagnosing — you're the bridge.</p>
              </article>
              <article>
                <h3>After the call</h3>
                <p>The doctor's diagnosis, prescription and advice appear under Follow-ups once they save it — check there before your next visit to that patient.</p>
              </article>
              <article>
                <h3>Location safety</h3>
                <p>Ask for consent before capturing location. The map shows only saved, consented field-visit coordinates.</p>
              </article>
              <article>
                <h3>Emergency referral</h3>
                <p>Ambulance dispatch is a separate service and is not connected to this dashboard yet.</p>
              </article>
            </section>
          )}
        </main>
      </div>

      {register && (
        <div className="modal-backdrop">
          <form className="modal form" onSubmit={savePatient}>
            <h2>Register patient</h2>
            <label>Full name<input name="name" required /></label>
            <div className="inline">
              <label>Age<input name="age" type="number" min="0" max="120" required /></label>
              <label>
                Gender
                <select name="gender">
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <label>Contact number<input name="contact" /></label>
            <label>Village / facility<input name="village" required /></label>
            <label>Health history / symptoms<textarea name="history" rows="3" /></label>
            <label className="consent-check">
              <input name="consent" type="checkbox" required /> Patient has given consent to create this care record.
            </label>
            <div className="actions">
              <button className="button button-green">Save patient</button>
              <button type="button" className="button button-soft" onClick={() => setRegister(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <PatientDetails
          patient={selected}
          doctors={doctors}
          onClose={() => setSelected(null)}
          onLocation={() => captureLocation(selected)}
          onStartCall={(doctorId) => startCall(selected, doctorId)}
        />
      )}

      {activeCall && (
        <LiveConsultation
          session={session}
          appointment={activeCall.appointment}
          role="asha"
          onClose={endCall}
          onEndCall={endCall}
        />
      )}

      {message && (
        <div className="patient-toast">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}
    </div>
  );
}

function PatientRow({ patient, onSelect, onLocation }) {
  return (
    <article className="asha-row">
      <span className="avatar">{patient.name?.charAt(0)}</span>
      <div>
        <b>{patient.name}</b>
        <small>{patient.age || "—"} years · {patient.village || "Location not recorded"} · {patient.contact || "No contact number"}</small>
        <small>{patient.history || "No health notes recorded"}</small>
      </div>
      <div className="asha-actions">
        <button className="button button-soft" onClick={() => onSelect(patient)}>Open</button>
        <button className="button button-soft" onClick={() => onLocation(patient)}>⌖ Location</button>
      </div>
    </article>
  );
}

function PatientDetails({ patient, doctors, onClose, onLocation, onStartCall }) {
  const [doctorId, setDoctorId] = useState(doctors[0]?._id || "");
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <p className="kicker">Patient field record</p>
        <h2>{patient.name}</h2>
        <p>{patient.age} years · {patient.gender} · {patient.village}</p>
        <p>{patient.history || "No health history recorded."}</p>

        <div className="asha-call-box">
          <b>Connect to an online doctor</b>
          <p className="muted">Start a live video consultation now, using your own camera and microphone, with {patient.name} beside you.</p>
          {doctors.length ? (
            <>
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}{d.specialization ? ` — ${d.specialization}` : ""}</option>
                ))}
              </select>
              <button className="button button-green" onClick={() => onStartCall(doctorId)} disabled={!doctorId}>
                📹 Start doctor video call
              </button>
            </>
          ) : (
            <p className="muted">No doctors are currently available.</p>
          )}
        </div>

        <div className="actions">
          <button className="button button-soft" onClick={onLocation}>Capture consented location</button>
          <button className="button button-soft" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

function ConsultationRow({ consultation, patient }) {
  const hasNotes = consultation.assessment || consultation.prescription || consultation.advice;
  return (
    <article className="asha-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <div>
          <b>{patient?.name || "Patient"}</b>
          <small>{consultation.symptoms || "Assisted consultation"} · Vitals recorded: {consultation.vitals?.length || 0}</small>
        </div>
        <span className="badge">{consultation.status === "completed" ? "Doctor's notes ready" : consultation.status}</span>
      </div>
      {hasNotes ? (
        <div className="asha-doctor-notes">
          {consultation.assessment && <p><b>Doctor's diagnosis:</b> {consultation.assessment}</p>}
          {consultation.prescription && <p><b>Prescription:</b> {consultation.prescription}</p>}
          {consultation.advice && <p><b>Advice for the patient:</b> {consultation.advice}</p>}
        </div>
      ) : (
        <p className="muted">Waiting for the doctor to save their notes from this consultation.</p>
      )}
    </article>
  );
}

function Empty({ text = "No patient records available yet." }) {
  return <p className="empty">{text}</p>;
}
