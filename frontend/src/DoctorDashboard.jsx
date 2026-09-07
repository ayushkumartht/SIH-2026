import React, { useEffect, useRef, useState } from "react";
import LiveConsultation from "./LiveConsultation";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

async function api(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || body.message || "Request failed");
  return body.data ?? body;
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Overview: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  ),
  Queue: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
  ),
  Patients: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 1 0 7.75"/></svg>
  ),
  Consultations: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 2 2h12a2 2 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ),
  Emergency: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  ),
  MapPin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  ),
  Phone: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  Cross: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
};

// ─── Leaflet Map Component ────────────────────────────────────────────────────
function LeafletMap({ markers = [], center, zoom = 14, height = "340px" }) {
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
      const map = L.default.map(mapRef.current).setView(
        center || [30.3753, 76.7821],
        zoom,
      );
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
    list.forEach((m) => {
      const marker = ctx.L.marker([m.lat, m.lng]).addTo(ctx.map);
      if (m.popup) marker.bindPopup(m.popup);
      ctx.markers.push(marker);
    });
  }

  return (
    <div
      ref={mapRef}
      style={{
        height,
        width: "100%",
        borderRadius: "8px",
        border: "1px solid #cbd5e1",
        overflow: "hidden",
      }}
    />
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function Stat({ icon: Icon, value, label, badgeColor = "#0284c7" }) {
  return (
    <div className="dd-stat-card">
      <div className="dd-stat-icon-wrap" style={{ backgroundColor: `${badgeColor}15`, color: badgeColor }}>
        {Icon ? <Icon /> : <span className="dd-stat-dot" style={{ backgroundColor: badgeColor }} />}
      </div>
      <div>
        <div className="dd-stat-value">{value}</div>
        <div className="dd-stat-label">{label}</div>
      </div>
    </div>
  );
}

// ─── Patient Card ─────────────────────────────────────────────────────────────
function PatientCard({ patient, onViewMap, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="dd-patient-card">
      <div className="dd-patient-row" onClick={() => setExpanded(!expanded)}>
        <div className="dd-avatar">
          {patient.name ? patient.name.charAt(0).toUpperCase() : "P"}
        </div>
        <div className="dd-patient-meta">
          <b>{patient.name}</b>
          <span>
            {patient.age ? `${patient.age} yrs` : "Age N/A"} • {patient.gender || "N/A"} • Phone: {patient.phone || "N/A"}
          </span>
        </div>
        <span className="dd-chevron">{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="dd-patient-detail">
          {patient.history && (
            <p>
              <b>Medical History:</b> {patient.history}
            </p>
          )}
          {patient.reports && patient.reports.length > 0 && (
            <div>
              <b>Diagnostic Reports:</b>
              <ul>
                {patient.reports.map((r, i) => (
                  <li key={i}>{typeof r === "string" ? r : r.title || "Report"}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="dd-patient-actions">
            <button
              className="dd-btn dd-btn-outline"
              onClick={(e) => {
                e.stopPropagation();
                onViewMap(patient);
              }}
            >
              <Icons.MapPin /> View Patient Location
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Emergency Card ───────────────────────────────────────────────────────────
const dispatchStatusLabel = {
  pending: "Request received",
  searching_ambulance: "Finding ambulance",
  vehicle_assigned: "Ambulance assigned",
  dispatched: "Dispatched",
  en_route: "En route",
  arrived: "Arrived",
  at_hospital: "At hospital",
  handed_over: "Handed over",
  cancelled: "Cancelled",
  closed: "Resolved",
};
function EmergencyCard({ emergency, token, onUpdated }) {
  const [showMap, setShowMap] = useState(false);
  const [note, setNote] = useState(emergency.doctorNote || "");
  const [busy, setBusy] = useState(false);

  async function acknowledge() {
    setBusy(true);
    try {
      await api(`/api/emergencies/${emergency._id}/acknowledge`, token, {
        method: "PUT",
        body: JSON.stringify({ doctorNote: note }),
      });
      onUpdated();
    } catch (e) {
      alert(e.message);
    }
    setBusy(false);
  }

  async function resolve() {
    setBusy(true);
    try {
      await api(`/api/emergencies/${emergency._id}/resolve`, token, { method: "PUT" });
      onUpdated();
    } catch (e) {
      alert(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="dd-emergency-card">
      <div className="dd-em-header">
        <span className={`dd-em-badge dd-em-badge-${emergency.severity}`}>
          {emergency.severity?.toUpperCase()} · {emergency.emergencyType}
        </span>
        <small>{new Date(emergency.createdAt).toLocaleString()}</small>
      </div>
      <h4>Patient: {emergency.patient?.name || "Unknown patient"}</h4>
      <p><b>Details:</b> {emergency.details || "No additional details provided."}</p>
      <p><b>Status:</b> {dispatchStatusLabel[emergency.dispatchStatus] || emergency.dispatchStatus}</p>
      {emergency.assignedVehicle && (
        <p>
          <b>Ambulance:</b> {emergency.assignedVehicle.vehicleNumber}
          {emergency.assignedVehicle.driver ? ` · ${emergency.assignedVehicle.driver.name} (${emergency.assignedVehicle.driver.phone})` : ""}
        </p>
      )}
      <div className="dd-em-loc">
        <span><b>GPS:</b> {emergency.latitude?.toFixed(5)}, {emergency.longitude?.toFixed(5)}</span>
        <button className="dd-btn dd-btn-sm dd-btn-outline" onClick={() => setShowMap((v) => !v)}>
          <Icons.MapPin /> {showMap ? "Hide map" : "View location"}
        </button>
      </div>
      {showMap && (
        <LeafletMap
          markers={[{ lat: emergency.latitude, lng: emergency.longitude, popup: emergency.patient?.name || "Emergency location" }]}
          center={[emergency.latitude, emergency.longitude]}
          zoom={15}
          height="240px"
        />
      )}
      {!emergency.acknowledged && (
        <div className="dd-em-actions">
          <input
            type="text"
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="dd-btn dd-btn-primary" disabled={busy} onClick={acknowledge}>
            Acknowledge
          </button>
        </div>
      )}
      {emergency.acknowledged && emergency.dispatchStatus !== "closed" && (
        <div className="dd-em-actions">
          <button className="dd-btn dd-btn-outline" disabled={busy} onClick={resolve}>
            Mark resolved
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Patient Location Map Modal ───────────────────────────────────────────────
function PatientLocationModal({ patient, consultation, token, onClose }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!consultation?._id || !patient?._id) {
      setLoading(false);
      setErr("No active consultation found to trace live location.");
      return;
    }
    api(
      `/api/portal/doctor/consultations/${consultation._id}/patients/${patient._id}/location`,
      token,
    )
      .then((d) => {
        setLocation(d);
        setLoading(false);
      })
      .catch((e) => {
        setErr(e.message);
        setLoading(false);
      });
  }, [patient, consultation, token]);

  const markers = location
    ? [
        {
          lat: location.latitude,
          lng: location.longitude,
          label: patient.name || "Patient",
          popup: `<b>${patient.name}</b><br>Accuracy: ${location.accuracyMeters ? Math.round(location.accuracyMeters) + "m" : "N/A"}<br>Updated: ${new Date(location.updatedAt || location.expiresAt).toLocaleTimeString()}`,
        },
      ]
    : [];

  return (
    <div className="dd-modal-backdrop" onClick={onClose}>
      <div className="dd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dd-modal-header">
          <h3>
            <Icons.MapPin /> Patient Location: {patient.name}
          </h3>
          <button className="dd-close" onClick={onClose}>
            <Icons.Cross />
          </button>
        </div>
        {loading ? (
          <div className="dd-loading">Fetching GPS location coordinates…</div>
        ) : err ? (
          <div className="dd-err">{err}</div>
        ) : !location ? (
          <div className="dd-empty">
            Patient has not broadcasted GPS location yet. Ask patient to press "Share Location" on their dashboard.
          </div>
        ) : (
          <>
            <div className="dd-location-info">
              <span><b>GPS Coordinates:</b> {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
              {location.accuracyMeters && (
                <span><b>Precision:</b> ±{Math.round(location.accuracyMeters)} meters</span>
              )}
              <span><b>Valid Until:</b> {new Date(location.expiresAt).toLocaleTimeString()}</span>
            </div>
            <LeafletMap
              markers={markers}
              center={[location.latitude, location.longitude]}
              zoom={15}
              height="320px"
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Doctor Dashboard Component ──────────────────────────────────────────
export default function DoctorDashboard({ session, onLogout }) {
  const token = session.token;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  // Active video call
  const [activeCall, setActiveCall] = useState(null);

  // Selected consultation for editing
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [formDiagnosis, setFormDiagnosis] = useState("");
  const [formPrescription, setFormPrescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Map Modal
  const [mapTarget, setMapTarget] = useState(null);

  // Toast
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const d = await api("/api/portal/doctor/dashboard", token);
      setData(d);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, [token]);

  if (loading && !data) {
    return (
      <div className="dd-loading-full">
        <div className="dd-spinner" />
        <p>Loading National Telehealth Portal Workspace…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dd-error-full">
        <h2>Portal Connection Error</h2>
        <p>{error}</p>
        <button className="dd-btn dd-btn-primary" onClick={loadData}>
          Retry Connection
        </button>
      </div>
    );
  }

  const { doctor, appointments = [], consultations = [], patients = [], emergencies = [] } = data || {};
  const pendingAppointments = appointments.filter((a) => a.status !== "completed" && a.status !== "cancelled").length;
  const activeConsultationsCount = consultations.filter((c) => c.status === "active").length;
  const completedToday = consultations.filter((c) => {
    const d = new Date(c.createdAt);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  }).length;

  const TABS = [
    { id: "overview", label: "Overview", icon: Icons.Overview },
    { id: "queue", label: "Queue", icon: Icons.Queue },
    { id: "patients", label: "Patients", icon: Icons.Patients },
    { id: "consultations", label: "Consultations", icon: Icons.Consultations },
    { id: "emergencies", label: "Emergencies", icon: Icons.Emergency, badge: emergencies.length },
  ];

  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (!selectedConsultation) return;
    setSaving(true);
    try {
      await api(`/api/doctors/consultations/${selectedConsultation._id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          assessment: formDiagnosis,
          prescription: formPrescription,
          advice: formNotes,
          status: "completed",
        }),
      });
      showToast("Clinical Assessment saved successfully");
      setSelectedConsultation(null);
      loadData();
    } catch (err) {
      showToast("Save Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenConsultation = (cons) => {
    setSelectedConsultation(cons);
    setFormDiagnosis(cons.assessment || "");
    setFormPrescription(cons.prescription || "");
    setFormNotes(cons.advice || "");
  };

  return (
    <div className="dd-root">
      {/* Official Government Header */}
      <header className="dd-topbar">
        <div className="dd-brand-wrap">
          <div className="dd-emblem-badge">GOVT OF INDIA</div>
          <span className="dd-brand">
            Nabha Care Teleconsultation <small>Medical Officer Workspace</small>
          </span>
        </div>
        <nav className="dd-nav">
          {TABS.map((t) => {
            const TabIcon = t.icon;
            return (
              <button
                key={t.id}
                className={`dd-nav-btn ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <TabIcon />
                <span>{t.label}</span>
                {t.badge ? <span className="dd-nav-badge">{t.badge}</span> : null}
              </button>
            );
          })}
        </nav>
        <div className="dd-topbar-right">
          <span className="dd-doc-name">Dr. {doctor?.name || "Medical Officer"}</span>
          <span className="dd-badge-spec">{doctor?.specialization || "General Physician"}</span>
          <button className="dd-btn dd-btn-outline" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="dd-main">

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div className="dd-section">
            <div className="dd-section-header">
              <h2 className="dd-section-title">Doctor Dashboard & Clinical Overview</h2>
              <span className="dd-date-pill">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            <div className="dd-stats-grid">
              <Stat icon={Icons.Patients} value={patients.length} label="Registered Patients" badgeColor="#0284c7" />
              <Stat icon={Icons.Queue} value={pendingAppointments} label="Pending Queue" badgeColor="#d97706" />
              <Stat icon={Icons.Phone} value={activeConsultationsCount} label="Active Tele-Consults" badgeColor="#16a34a" />
              <Stat icon={Icons.Check} value={completedToday} label="Completed Today" badgeColor="#2563eb" />
            </div>

            <div className="dd-overview-grid">
              <div className="dd-card">
                <div className="dd-card-header">
                  <h3>Upcoming Appointments Queue</h3>
                  <button className="dd-link-btn" onClick={() => setTab("queue")}>View All</button>
                </div>
                {appointments.slice(0, 5).length ? (
                  appointments.slice(0, 5).map((apt) => (
                    <div className="dd-list-item" key={apt._id}>
                      <div>
                        <b>{apt.patient?.name || "Patient"}</b>
                        <small>
                          {apt.date ? new Date(apt.date).toLocaleDateString() : "Today"} • {apt.time}
                        </small>
                      </div>
                      <span className={`dd-status-badge ${apt.status}`}>{apt.status?.toUpperCase()}</span>
                    </div>
                  ))
                ) : (
                  <p className="dd-muted-text">No upcoming appointments scheduled for today.</p>
                )}
              </div>

              <div className="dd-card">
                <div className="dd-card-header">
                  <h3>Recent Patients</h3>
                  <button className="dd-link-btn" onClick={() => setTab("patients")}>View All</button>
                </div>
                {patients.slice(0, 4).length ? (
                  patients.slice(0, 4).map((p) => (
                    <div className="dd-list-item" key={p._id}>
                      <div>
                        <b>{p.name}</b>
                        <small>Age: {p.age || "N/A"} • Gender: {p.gender || "N/A"}</small>
                      </div>
                      <button
                        className="dd-btn dd-btn-sm dd-btn-outline"
                        onClick={() => {
                          const activeC = consultations.find((c) => c.patient?._id === p._id);
                          setMapTarget({ patient: p, consultation: activeC });
                        }}
                      >
                        <Icons.MapPin /> Map
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="dd-muted-text">No patients recorded in database.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── QUEUE TAB ── */}
        {tab === "queue" && (
          <div className="dd-section">
            <h2 className="dd-section-title">Today's Appointment Queue</h2>
            <div className="dd-queue-grid">
              {appointments.length ? (
                appointments.map((apt) => {
                  const patient = apt.patient || {};
                  const activeCons = consultations.find((c) => c.patient?._id === patient._id);
                  return (
                    <div className="dd-queue-card" key={apt._id}>
                      <div className="dd-qc-header">
                        <div>
                          <b className="dd-qc-name">{patient.name || "Patient"}</b>
                          <div className="dd-qc-meta">
                            <span>Age: {patient.age || "N/A"}</span>
                            <span>Phone: {patient.phone || "N/A"}</span>
                          </div>
                        </div>
                        <span className={`dd-status-badge ${apt.status}`}>{apt.status?.toUpperCase()}</span>
                      </div>

                      {apt.reason && (
                        <div className="dd-qc-reason">
                          <b>Reason for Visit:</b> {apt.reason}
                        </div>
                      )}

                      <div className="dd-qc-actions">
                        <button
                          className="dd-btn dd-btn-primary"
                          onClick={() =>
                            setActiveCall({
                              roomId: apt.roomId || `room-${apt._id}`,
                              patientName: patient.name || "Patient",
                              consultationId: activeCons?._id,
                            })
                          }
                        >
                          <Icons.Phone /> Join Consultation
                        </button>

                        <button
                          className="dd-btn dd-btn-outline"
                          onClick={() => setMapTarget({ patient, consultation: activeCons })}
                        >
                          <Icons.MapPin /> View Location
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="dd-empty">No appointment requests in current queue.</div>
              )}
            </div>
          </div>
        )}

        {/* ── PATIENTS TAB ── */}
        {tab === "patients" && (
          <div className="dd-section">
            <h2 className="dd-section-title">Registered Patient Records ({patients.length})</h2>
            <div className="dd-patients-list">
              {patients.length ? (
                patients.map((p) => {
                  const activeC = consultations.find((c) => c.patient?._id === p._id);
                  return (
                    <PatientCard
                      key={p._id}
                      patient={p}
                      onViewMap={(pt) => setMapTarget({ patient: pt, consultation: activeC })}
                      onSelect={(pt) => setMapTarget({ patient: pt, consultation: activeC })}
                    />
                  );
                })
              ) : (
                <div className="dd-empty">No patient records found.</div>
              )}
            </div>
          </div>
        )}

        {/* ── CONSULTATIONS TAB ── */}
        {tab === "consultations" && (
          <div className="dd-section">
            <h2 className="dd-section-title">Clinical Consultation Records ({consultations.length})</h2>
            <div className="dd-consultations-layout">
              <div className="dd-consult-list">
                {consultations.length ? (
                  consultations.map((c) => (
                    <div
                      key={c._id}
                      className={`dd-consult-card ${selectedConsultation?._id === c._id ? "selected" : ""}`}
                      onClick={() => handleOpenConsultation(c)}
                    >
                      <div className="dd-cc-header">
                        <b>{c.patient?.name || "Patient"}</b>
                        <span className={`dd-status-badge ${c.status}`}>{c.status?.toUpperCase()}</span>
                      </div>
                      <small>Date: {new Date(c.createdAt).toLocaleDateString()} • {new Date(c.createdAt).toLocaleTimeString()}</small>
                      {c.diagnosis && <p className="dd-cc-diag"><b>Diagnosis:</b> {c.diagnosis}</p>}
                    </div>
                  ))
                ) : (
                  <div className="dd-empty">No consultation notes recorded yet.</div>
                )}
              </div>

              {/* Consultation Assessment Editor */}
              {selectedConsultation ? (
                <form className="dd-consult-form" onSubmit={handleSaveConsultation}>
                  <div className="dd-cf-header">
                    <h3>Clinical Assessment: {selectedConsultation.patient?.name}</h3>
                    <button
                      type="button"
                      className="dd-btn dd-btn-sm dd-btn-outline"
                      onClick={() => setMapTarget({ patient: selectedConsultation.patient, consultation: selectedConsultation })}
                    >
                      <Icons.MapPin /> Map
                    </button>
                  </div>

                  {(() => {
                    const latestVitals = selectedConsultation.vitals?.[selectedConsultation.vitals.length - 1];
                    return (
                      <div className="dd-vitals-inputs">
                        <span>Temp: {latestVitals?.temperatureC ? `${latestVitals.temperatureC}°C` : "—"}</span>
                        <span>BP: {latestVitals ? `${latestVitals.systolicBp ?? "—"}/${latestVitals.diastolicBp ?? "—"}` : "—"}</span>
                        <span>Pulse: {latestVitals?.heartRateBpm ? `${latestVitals.heartRateBpm} bpm` : "—"}</span>
                        <span>SpO2: {latestVitals?.oxygenSaturationPercent ? `${latestVitals.oxygenSaturationPercent}%` : "—"}</span>
                      </div>
                    );
                  })()}

                  <label className="dd-field-label">
                    Clinical Diagnosis
                    <textarea
                      rows={3}
                      placeholder="Enter clinical findings and primary diagnosis..."
                      value={formDiagnosis}
                      onChange={(e) => setFormDiagnosis(e.target.value)}
                    />
                  </label>

                  <label className="dd-field-label">
                    Prescription & Medication Advice
                    <textarea
                      rows={3}
                      placeholder="Medication names, dosage, frequency, duration..."
                      value={formPrescription}
                      onChange={(e) => setFormPrescription(e.target.value)}
                    />
                  </label>

                  <label className="dd-field-label">
                    General Clinical Notes
                    <textarea
                      rows={2}
                      placeholder="Follow-up instructions, referral notes..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </label>

                  <div className="dd-form-actions">
                    <button type="submit" className="dd-btn dd-btn-primary" disabled={saving}>
                      {saving ? "Saving Assessment…" : "Save Clinical Record"}
                    </button>
                    <button
                      type="button"
                      className="dd-btn dd-btn-outline"
                      onClick={() => setSelectedConsultation(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="dd-consult-placeholder">
                  Select a consultation record from the list to view or edit clinical diagnosis and prescription.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EMERGENCIES TAB ── */}
        {tab === "emergencies" && (
          <div className="dd-section">
            <h2 className="dd-section-title">Emergency & Urgent Alerts ({emergencies.length})</h2>
            <div className="dd-emergencies-list">
              {emergencies.length ? (
                emergencies.map((em) => (
                  <EmergencyCard
                    key={em._id}
                    emergency={em}
                    token={token}
                    onUpdated={loadData}
                  />
                ))
              ) : (
                <div className="dd-empty">No active emergency alerts assigned to you.</div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ── Patient Location Map Modal ── */}
      {mapTarget && (
        <PatientLocationModal
          patient={mapTarget.patient}
          consultation={mapTarget.consultation}
          token={token}
          onClose={() => setMapTarget(null)}
        />
      )}

      {/* ── Teleconsultation Active Call ── */}
      {activeCall && (
        <LiveConsultation
          session={session}
          token={token}
          appointment={activeCall.appointment || { _id: activeCall.roomId, id: activeCall.roomId }}
          roomId={activeCall.roomId}
          role="doctor"
          onClose={() => setActiveCall(null)}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && <div className="dd-toast">{toast}</div>}
    </div>
  );
}
