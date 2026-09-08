import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

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

function LeafletMap({ markers = [], center, zoom = 14, height = "260px" }) {
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
      const map = L.default.map(mapRef.current).setView(center || [30.3753, 76.15], zoom);
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

  return <div ref={mapRef} style={{ height, width: "100%", borderRadius: "10px", overflow: "hidden" }} />;
}

const EMERGENCY_NEXT = {
  dispatched: ["en_route", "Start driving"],
  en_route: ["arrived", "Mark arrived at scene"],
  arrived: ["at_hospital", "Mark arrived at hospital"],
  at_hospital: ["handed_over", "Mark patient handed over"],
  handed_over: ["closed", "Complete & close"],
};
const TRANSPORT_NEXT = {
  dispatched: ["en_route", "Start driving"],
  en_route: ["arrived", "Mark arrived"],
  arrived: ["completed", "Complete ride"],
};

function OfferModal({ offer, token, onResolved }) {
  const [secondsLeft, setSecondsLeft] = useState(Math.round(offer.expiresInSeconds || 30));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) onResolved();
  }, [secondsLeft]);

  async function respond(decision) {
    setBusy(true);
    try {
      await api(`/api/driver/jobs/${offer.attemptId}/respond`, token, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
    } catch {
      /* offer may have already expired server-side; modal closes regardless */
    }
    onResolved();
  }

  const pct = Math.round((secondsLeft / Math.max(1, offer.expiresInSeconds || 30)) * 100);

  return (
    <div className="drv-offer-backdrop">
      <div className="drv-offer-card">
        <div className="drv-offer-ring" style={{ "--pct": `${pct}%` }}>
          <span>{secondsLeft}s</span>
        </div>
        <h2>{offer.requestType === "transport" ? "New Transport Request" : "New Emergency Dispatch"}</h2>
        {offer.severity && <span className={`drv-severity drv-severity-${offer.severity}`}>{offer.severity.toUpperCase()}</span>}
        <p className="drv-offer-title">{offer.title || offer.emergencyType || "Ride request"}</p>
        <p className="drv-offer-distance">Approx. {offer.distanceKm} km away</p>
        <div className="drv-offer-actions">
          <button className="drv-btn drv-btn-decline" disabled={busy} onClick={() => respond("decline")}>
            Decline
          </button>
          <button className="drv-btn drv-btn-accept" disabled={busy} onClick={() => respond("accept")}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriverDashboard({ session, onLogout }) {
  const token = session.token;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offer, setOffer] = useState(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const socketRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  async function load() {
    try {
      const d = await api("/api/driver/me", token);
      setData(d);
      setError("");
    } catch (e) {
      if (/token|unauthor|expired/i.test(e.message)) {
        onLogout();
        return;
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);

    const socket = io(API, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("driver:join", () => {}));
    socket.on("dispatch:offer", (payload) => setOffer(payload));
    socket.on("dispatch:offer:resolved", (payload) => {
      setOffer((current) => (current && String(current.attemptId) === String(payload.attemptId) ? null : current));
    });
    socket.on("emergency:status_changed", load);
    socket.on("transport:status_changed", load);

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [token]);

  // While there's an active job, keep reporting this driver's live GPS so the
  // patient (and admin) can watch the ambulance move in real time.
  const hasActiveJob = Boolean(data?.activeJob);
  useEffect(() => {
    if (!hasActiveJob || !navigator.geolocation) return undefined;
    let lastSentAt = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentAt < 4000) return;
        lastSentAt = now;
        socketRef.current?.emit("driver:location:update", {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasActiveJob]);

  async function toggleStatus() {
    setBusy(true);
    try {
      const next = data.driver.status === "off_duty" ? "available" : "off_duty";
      await api("/api/driver/me/status", token, { method: "PUT", body: JSON.stringify({ status: next }) });
      showToast(next === "off_duty" ? "You're now off duty" : "You're now available for dispatch");
      load();
    } catch (e) {
      showToast(e.message);
    }
    setBusy(false);
  }

  async function advanceJob() {
    if (!data?.activeJob) return;
    const nextMap = data.activeJob.kind === "emergency" ? EMERGENCY_NEXT : TRANSPORT_NEXT;
    const next = nextMap[data.activeJob.dispatchStatus || data.activeJob.status];
    if (!next) return;
    setBusy(true);
    try {
      await api(`/api/driver/jobs/${data.activeJob.kind}/${data.activeJob._id}/status`, token, {
        method: "PUT",
        body: JSON.stringify({ status: next[0] }),
      });
      showToast(`Status updated: ${next[1]}`);
      load();
    } catch (e) {
      showToast(e.message);
    }
    setBusy(false);
  }

  function resolveOffer() {
    setOffer(null);
    load();
  }

  if (loading && !data) {
    return (
      <div className="drv-loading-full">
        <div className="drv-spinner" />
        <p>Loading driver workspace…</p>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="drv-loading-full">
        <h2>Connection error</h2>
        <p>{error}</p>
        <button className="drv-btn drv-btn-accept" onClick={load}>Retry</button>
      </div>
    );
  }

  const { driver, ambulance, activeJob, history } = data || {};
  const job = activeJob;
  const jobStatus = job ? job.dispatchStatus || job.status : null;
  const nextAction = job ? (job.kind === "emergency" ? EMERGENCY_NEXT : TRANSPORT_NEXT)[jobStatus] : null;
  const patient = job?.patient;
  const destination = job?.selectedHospital || job?.destinationHospital;
  const pickupLat = job ? job.latitude ?? job.pickupLatitude : null;
  const pickupLng = job ? job.longitude ?? job.pickupLongitude : null;

  return (
    <div className="drv-root">
      <header className="drv-topbar">
        <div>
          <b>Nabha Care</b>
          <small>Driver workspace</small>
        </div>
        <div className="drv-topbar-right">
          <span className="drv-vehicle-badge">{ambulance ? ambulance.vehicleNumber : "No vehicle assigned"}</span>
          <button className="drv-status-toggle" data-status={driver?.status} disabled={busy} onClick={toggleStatus}>
            {driver?.status === "off_duty" ? "Off duty" : "Available"}
          </button>
          <button className="drv-btn drv-btn-outline" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="drv-main">
        <h1 className="drv-hello">Hello, {driver?.name}</h1>

        {job ? (
          <div className="drv-job-card">
            <div className="drv-job-header">
              <span className={`drv-job-kind drv-job-kind-${job.kind}`}>{job.kind === "emergency" ? "EMERGENCY" : "TRANSPORT"}</span>
              <span className="drv-job-status">{(jobStatus || "").replace(/_/g, " ").toUpperCase()}</span>
            </div>
            {patient && (
              <p className="drv-job-patient">
                <b>{patient.name}</b> — {patient.age || "N/A"} yrs, {patient.gender || "N/A"} · {patient.contact || "N/A"}
              </p>
            )}
            {job.details && <p className="drv-job-detail">{job.details}</p>}
            {job.notes && <p className="drv-job-detail">{job.notes}</p>}
            {destination && (
              <p className="drv-job-detail"><b>Destination:</b> {destination.name} — {destination.address}</p>
            )}
            {pickupLat != null && pickupLng != null && (
              <LeafletMap
                markers={[
                  { lat: pickupLat, lng: pickupLng, popup: "Pickup location" },
                  ...(destination?.latitude ? [{ lat: destination.latitude, lng: destination.longitude, popup: destination.name }] : []),
                ]}
                center={[pickupLat, pickupLng]}
              />
            )}
            {nextAction && (
              <button className="drv-btn drv-btn-accept drv-job-action" disabled={busy} onClick={advanceJob}>
                {nextAction[1]}
              </button>
            )}
          </div>
        ) : (
          <div className="drv-empty-card">
            <p>No active job right now.</p>
            <small>{driver?.status === "off_duty" ? "You're off duty — go available to receive dispatch offers." : "You're available — waiting for a nearby dispatch request."}</small>
          </div>
        )}

        <h2 className="drv-section-title">Recent jobs</h2>
        <div className="drv-history-list">
          {history?.length ? (
            history.map((h) => (
              <div className="drv-history-row" key={h._id}>
                <span className={`drv-job-kind drv-job-kind-${h.kind}`}>{h.kind === "emergency" ? "EMERGENCY" : "TRANSPORT"}</span>
                <span>{(h.dispatchStatus || h.status || "").replace(/_/g, " ")}</span>
                <small>{new Date(h.createdAt).toLocaleString()}</small>
              </div>
            ))
          ) : (
            <p className="drv-muted">No completed jobs yet.</p>
          )}
        </div>
      </main>

      {offer && <OfferModal offer={offer} token={token} onResolved={resolveOffer} />}
      {toast && <div className="drv-toast">{toast}</div>}
    </div>
  );
}
