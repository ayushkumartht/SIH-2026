import React, { useEffect, useState } from "react";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
async function api(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || body.message || "Request failed");
  return body.data ?? body;
}

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
const NEXT_STATUS = {
  vehicle_assigned: [["dispatched", "Mark dispatched"]],
  dispatched: [["en_route", "Mark en route"]],
  en_route: [["arrived", "Mark arrived"]],
  arrived: [["at_hospital", "Mark at hospital"]],
  at_hospital: [["handed_over", "Mark handed over"]],
  handed_over: [["closed", "Close case"]],
};

export default function AdminDashboard({ session, onLogout }) {
  const token = session.token;
  const isAdmin = session.user?.role === "admin";
  const [tab, setTab] = useState("overview");
  const [emergencies, setEmergencies] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [staff, setStaff] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [addAmbulanceOpen, setAddAmbulanceOpen] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [addMedicineOpen, setAddMedicineOpen] = useState(false);

  async function loadAll() {
    try {
      const [em, amb, meds] = await Promise.all([
        api("/api/emergencies", token),
        api("/api/ambulances", token),
        api("/api/medicines", token),
      ]);
      setEmergencies(em);
      setAmbulances(amb);
      setMedicines(meds);
      if (isAdmin) setStaff(await api("/api/staff", token));
      setHospitals(await api("/api/hospitals", token));
      setError("");
    } catch (e) {
      if (/token|unauthor|expired/i.test(e.message)) {
        onLogout();
        return;
      }
      setError(e.message);
    }
    setLoading(false);
  }
  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 20000);
    return () => clearInterval(timer);
  }, []);

  async function assignVehicle(emergencyId, vehicleId, label) {
    try {
      await api(`/api/emergencies/${emergencyId}/assign-vehicle`, token, {
        method: "PUT",
        body: JSON.stringify({ vehicleId }),
      });
      setMessage(`Assigned ${label}.`);
      loadAll();
    } catch (e) {
      setMessage(e.message);
    }
  }
  async function advanceStatus(emergencyId, status) {
    try {
      await api(`/api/emergencies/${emergencyId}/status`, token, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      loadAll();
    } catch (e) {
      setMessage(e.message);
    }
  }

  const activeEmergencies = emergencies.filter((e) => !["closed", "cancelled"].includes(e.dispatchStatus));
  const availableAmbulances = ambulances.filter((a) => a.status === "available");

  if (loading) return <div className="patient-loading">Loading admin console…</div>;

  return (
    <div className="asha-app">
      <header className="asha-header">
        <a href="/" className="brand">
          <span className="brand-mark">✚</span>
          <span>
            Nabha Care<small>Admin / Receptionist console</small>
          </span>
        </a>
        <div>
          <span className="offline-pill">{session.user?.name} · {session.user?.role}</span>
          <button className="button button-dark" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <div className="asha-layout">
        <aside>
          <div className="asha-person">
            <span className="avatar">{session.user?.name?.charAt(0) || "A"}</span>
            <b>{session.user?.name}</b>
            <small>{isAdmin ? "Administrator" : "Receptionist"}</small>
          </div>
          {[
            ["overview", "Overview"],
            ["emergencies", `Emergencies (${activeEmergencies.length})`],
            ["ambulances", "Ambulance fleet"],
            ["pharmacy", "Pharmacy stock"],
            ...(isAdmin ? [["staff", "Staff"]] : []),
          ].map(([id, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </aside>
        <main>
          {error && <p className="error">{error}</p>}

          {tab === "overview" && (
            <section className="asha-stats">
              <article><b>{activeEmergencies.length}</b><span>Active emergencies</span></article>
              <article><b>{availableAmbulances.length}</b><span>Ambulances available</span></article>
              <article><b>{ambulances.length}</b><span>Fleet size</span></article>
              {isAdmin && <article><b>{staff.length}</b><span>Staff accounts</span></article>}
            </section>
          )}

          {tab === "emergencies" && (
            <section className="asha-panel">
              <div className="panel-title"><h2>Emergency dispatch queue</h2></div>
              {emergencies.length ? (
                emergencies.map((em) => (
                  <EmergencyDispatchRow
                    key={em._id}
                    emergency={em}
                    token={token}
                    onAssign={assignVehicle}
                    onAdvance={advanceStatus}
                  />
                ))
              ) : (
                <p className="empty">No emergencies raised yet.</p>
              )}
            </section>
          )}

          {tab === "ambulances" && (
            <section>
              <div className="panel-title">
                <h2>Ambulance fleet</h2>
                <button className="button button-green" onClick={() => setAddAmbulanceOpen(true)}>+ Add ambulance</button>
              </div>
              <section className="asha-panel">
                {ambulances.length ? (
                  ambulances.map((a) => (
                    <article className="asha-row" key={a._id}>
                      <div>
                        <b>{a.vehicleNumber}</b>
                        <small>{a.type?.replace(/_/g, " ")} · Capacity {a.capacity}</small>
                        {a.driver && <small>Driver: {a.driver.name} ({a.driver.phone})</small>}
                      </div>
                      <span className="badge">{a.status}</span>
                    </article>
                  ))
                ) : (
                  <p className="empty">No ambulances registered yet.</p>
                )}
              </section>
            </section>
          )}

          {tab === "pharmacy" && (
            <section>
              <div className="panel-title">
                <h2>Pharmacy stock</h2>
                <button className="button button-green" onClick={() => setAddMedicineOpen(true)}>+ Add medicine</button>
              </div>
              <section className="asha-panel">
                {medicines.length ? (
                  medicines.map((m) => (
                    <MedicineRow key={m._id} medicine={m} token={token} onUpdated={loadAll} />
                  ))
                ) : (
                  <p className="empty">No medicine stock records yet.</p>
                )}
              </section>
            </section>
          )}

          {tab === "staff" && isAdmin && (
            <section>
              <div className="panel-title">
                <h2>Staff accounts</h2>
                <button className="button button-green" onClick={() => setAddStaffOpen(true)}>+ Add staff</button>
              </div>
              <section className="asha-panel">
                {staff.length ? (
                  staff.map((s) => (
                    <article className="asha-row" key={s._id}>
                      <div>
                        <b>{s.name}</b>
                        <small>{s.email}</small>
                      </div>
                      <span className="badge">{s.role}</span>
                    </article>
                  ))
                ) : (
                  <p className="empty">No staff accounts yet.</p>
                )}
              </section>
            </section>
          )}
        </main>
      </div>

      {addAmbulanceOpen && (
        <AddAmbulanceModal
          token={token}
          onClose={() => setAddAmbulanceOpen(false)}
          onSaved={() => {
            setAddAmbulanceOpen(false);
            loadAll();
          }}
        />
      )}
      {addMedicineOpen && (
        <AddMedicineModal
          token={token}
          hospitals={hospitals}
          onClose={() => setAddMedicineOpen(false)}
          onSaved={() => {
            setAddMedicineOpen(false);
            loadAll();
          }}
        />
      )}
      {addStaffOpen && (
        <AddStaffModal
          token={token}
          onClose={() => setAddStaffOpen(false)}
          onSaved={() => {
            setAddStaffOpen(false);
            loadAll();
          }}
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

function EmergencyDispatchRow({ emergency, token, onAssign, onAdvance }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  async function findAmbulances() {
    setLoadingSuggestions(true);
    try {
      setSuggestions(await api(`/api/emergencies/${emergency._id}/suggest-ambulances`, token));
    } catch {
      setSuggestions([]);
    }
    setLoadingSuggestions(false);
  }

  const nextSteps = NEXT_STATUS[emergency.dispatchStatus] || [];

  return (
    <article className="asha-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <div>
          <b>{emergency.patient?.name || "Unknown patient"}</b>
          <small>
            {emergency.severity?.toUpperCase()} · {emergency.emergencyType} ·{" "}
            {new Date(emergency.createdAt).toLocaleString()}
          </small>
          <small>{emergency.details}</small>
        </div>
        <span className="badge">{dispatchStatusLabel[emergency.dispatchStatus] || emergency.dispatchStatus}</span>
      </div>

      {emergency.assignedVehicle && (
        <small>
          Ambulance: {emergency.assignedVehicle.vehicleNumber}
          {emergency.assignedVehicle.driver ? ` · ${emergency.assignedVehicle.driver.name} (${emergency.assignedVehicle.driver.phone})` : ""}
        </small>
      )}

      {["pending", "searching_ambulance"].includes(emergency.dispatchStatus) && (
        <div className="asha-actions">
          <button className="button button-soft" onClick={findAmbulances} disabled={loadingSuggestions}>
            {loadingSuggestions ? "Searching…" : "Find nearest ambulance"}
          </button>
        </div>
      )}
      {suggestions && (
        suggestions.length ? (
          <div className="asha-actions" style={{ flexWrap: "wrap" }}>
            {suggestions.map((s) => (
              <button
                key={s._id}
                className="button button-green"
                onClick={() => onAssign(emergency._id, s._id, `${s.vehicleNumber} (${s.distanceKm} km away)`)}
              >
                Assign {s.vehicleNumber} · {s.distanceKm} km
              </button>
            ))}
          </div>
        ) : (
          <p className="empty">No available ambulances found nearby.</p>
        )
      )}

      {nextSteps.length > 0 && (
        <div className="asha-actions">
          {nextSteps.map(([status, label]) => (
            <button key={status} className="button button-soft" onClick={() => onAdvance(emergency._id, status)}>
              {label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function MedicineRow({ medicine, token, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(medicine.stockQuantity);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api(`/api/medicines/${medicine._id}`, token, {
        method: "PUT",
        body: JSON.stringify({ stockQuantity: Number(quantity) }),
      });
      setEditing(false);
      onUpdated();
    } catch (e) {
      alert(e.message);
    }
    setSaving(false);
  }

  return (
    <article className="asha-row">
      <div>
        <b>{medicine.name}</b>
        <small>{medicine.hospital?.name || "Hospital"} · {medicine.category || "General"}</small>
      </div>
      {editing ? (
        <div className="asha-actions">
          <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: 80 }} />
          <button className="button button-green" disabled={saving} onClick={save}>Save</button>
          <button className="button button-soft" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div className="asha-actions">
          <span className={`badge ${medicine.stockQuantity <= medicine.lowStockThreshold ? "badge-low" : ""}`}>
            {medicine.stockQuantity} {medicine.unit}
          </span>
          <button className="button button-soft" onClick={() => setEditing(true)}>Update stock</button>
        </div>
      )}
    </article>
  );
}

function AddMedicineModal({ token, hospitals, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", hospital: hospitals[0]?._id || "", category: "", unit: "tablets", stockQuantity: 0 });
  const [error, setError] = useState("");
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.hospital) {
      setError("No hospital available. Add a hospital record first.");
      return;
    }
    try {
      await api("/api/medicines", token, {
        method: "POST",
        body: JSON.stringify({ ...form, stockQuantity: Number(form.stockQuantity) }),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal form" onSubmit={submit}>
        <h2>Add medicine stock record</h2>
        <label>Medicine name<input name="name" required value={form.name} onChange={update} /></label>
        <label>
          Hospital
          <select name="hospital" required value={form.hospital} onChange={update}>
            {hospitals.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
        </label>
        <div className="inline">
          <label>Category<input name="category" value={form.category} onChange={update} placeholder="e.g. Antibiotic" /></label>
          <label>Unit<input name="unit" value={form.unit} onChange={update} /></label>
        </div>
        <label>Stock quantity<input name="stockQuantity" type="number" min="0" value={form.stockQuantity} onChange={update} /></label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button className="button button-green">Save medicine</button>
          <button type="button" className="button button-soft" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function AddAmbulanceModal({ token, onClose, onSaved }) {
  const [form, setForm] = useState({
    vehicleNumber: "",
    type: "basic",
    capacity: 1,
    latitude: "",
    longitude: "",
    driverName: "",
    driverPhone: "",
    driverLicense: "",
  });
  const [error, setError] = useState("");
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/ambulances", token, {
        method: "POST",
        body: JSON.stringify({
          vehicleNumber: form.vehicleNumber,
          type: form.type,
          capacity: Number(form.capacity),
          currentLocation: { latitude: Number(form.latitude), longitude: Number(form.longitude) },
          driver: { name: form.driverName, phone: form.driverPhone, licenseNo: form.driverLicense },
        }),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal form" onSubmit={submit}>
        <h2>Add ambulance</h2>
        <label>Vehicle number<input name="vehicleNumber" required value={form.vehicleNumber} onChange={update} /></label>
        <div className="inline">
          <label>
            Type
            <select name="type" value={form.type} onChange={update}>
              <option value="basic">Basic</option>
              <option value="advanced_life_support">Advanced life support</option>
              <option value="patient_transport">Patient transport</option>
            </select>
          </label>
          <label>Capacity<input name="capacity" type="number" min="1" value={form.capacity} onChange={update} /></label>
        </div>
        <div className="inline">
          <label>Current latitude<input name="latitude" type="number" step="any" required value={form.latitude} onChange={update} /></label>
          <label>Current longitude<input name="longitude" type="number" step="any" required value={form.longitude} onChange={update} /></label>
        </div>
        <label>Driver name<input name="driverName" required value={form.driverName} onChange={update} /></label>
        <div className="inline">
          <label>Driver phone<input name="driverPhone" required value={form.driverPhone} onChange={update} /></label>
          <label>License no.<input name="driverLicense" required value={form.driverLicense} onChange={update} /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button className="button button-green">Save ambulance</button>
          <button type="button" className="button button-soft" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function AddStaffModal({ token, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "receptionist" });
  const [error, setError] = useState("");
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/staff", token, { method: "POST", body: JSON.stringify(form) });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal form" onSubmit={submit}>
        <h2>Add staff account</h2>
        <label>Full name<input name="name" required value={form.name} onChange={update} /></label>
        <label>Email<input name="email" type="email" required value={form.email} onChange={update} /></label>
        <label>Password<input name="password" type="password" required minLength={6} value={form.password} onChange={update} /></label>
        <label>
          Role
          <select name="role" value={form.role} onChange={update}>
            <option value="receptionist">Receptionist</option>
            <option value="admin">Admin</option>
            <option value="asha">ASHA worker</option>
          </select>
        </label>
        <p className="muted">Doctor and lab accounts are created via the sign-up page, not here.</p>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button className="button button-green">Save staff account</button>
          <button type="button" className="button button-soft" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
