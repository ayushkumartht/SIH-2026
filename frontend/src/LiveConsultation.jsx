import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
async function request(path, token, options = {}) {
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
    throw new Error(body.error || body.message || "Call request failed");
  return body.data ?? body;
}
const qualityText = {
  unknown: "Checking connection",
  hd: "HD video",
  low_res: "Low-resolution video",
  audio_only: "Audio only",
  very_poor: "Connection too weak — use fallback",
};

export default function LiveConsultation({
  session,
  appointment,
  role,
  onClose,
}) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peer = useRef(null);
  const socket = useRef(null);
  const stream = useRef(null);
  const callRef = useRef(null);
  const pendingCandidates = useRef([]);
  const qualityTimer = useRef(null);
  const [state, setState] = useState({
    loading: true,
    status: "Preparing your secure call…",
    quality: "unknown",
    rttMs: null,
    packetLossPercent: null,
    remote: false,
    mic: true,
    camera: true,
    error: "",
  });
  const [showVitals, setShowVitals] = useState(false);
  const [care, setCare] = useState(null);
  useEffect(() => {
    const header = document.querySelector(".call-screen header");
    if (!header) return undefined;
    let panel = header.querySelector(".call-network");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "call-network";
      header.insertBefore(panel, header.lastElementChild);
    }
    panel.innerHTML = `<b>${qualityText[state.quality] || qualityText.unknown}</b><span>Ping ${state.rttMs == null ? "--" : `${state.rttMs} ms`}</span><span>Loss ${state.packetLossPercent == null ? "--" : `${state.packetLossPercent}%`}</span>`;
    return undefined;
  }, [state.quality, state.rttMs, state.packetLossPercent]);
  useEffect(() => {
    let disposed = false;
    const stop = () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      peer.current?.close();
      socket.current?.disconnect();
    };
    async function start() {
      try {
        const sessionData = await request(
          "/api/portal/calls/session",
          session.token,
          {
            method: "POST",
            body: JSON.stringify({
              appointmentId: appointment._id || appointment.id,
            }),
          },
        );
        if (disposed) return;
        callRef.current = sessionData;
        if (role === "patient" && !sessionData.consentGranted)
          await request(
            `/api/portal/calls/${sessionData.callId}/consent`,
            session.token,
            { method: "POST", body: "{}" },
          );
        if (role === "doctor") {
          try {
            setCare(
              await request(
                `/api/portal/doctor/calls/${sessionData.callId}/care`,
                session.token,
              ),
            );
          } catch {
            /* Care data may not be available yet. */
          }
        }
        let media;
        try {
          media = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } catch {
          media = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          setState((value) => ({
            ...value,
            camera: false,
            status: "Camera unavailable — continuing with audio.",
          }));
        }
        if (disposed) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        if (localVideo.current) {
          localVideo.current.srcObject = media;
          localVideo.current.play().catch(() => {});
        }
        const connection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peer.current = connection;
        media.getTracks().forEach((track) => connection.addTrack(track, media));
        connection.ontrack = (event) => {
          const remoteStream = event.streams[0];
          if (remoteVideo.current) {
            remoteVideo.current.srcObject = remoteStream;
            remoteVideo.current.play().catch(() => {});
          }
          setState((value) => ({
            ...value,
            remote: true,
            status: "Connected to your care team",
          }));
        };
        connection.onicecandidate = (event) => {
          if (event.candidate)
            socket.current?.emit("ice-candidate", {
              roomId: sessionData.roomId,
              candidate: event.candidate,
            });
        };
        connection.onconnectionstatechange = () => {
          if (connection.connectionState === "failed")
            setState((value) => ({
              ...value,
              error: "Connection interrupted. Use Reconnect to try again.",
            }));
        };
        const liveSocket = io(API, {
          auth: { token: session.token },
          transports: ["websocket", "polling"],
        });
        socket.current = liveSocket;
        liveSocket.on("connect_error", () =>
          setState((value) => ({
            ...value,
            error: "Realtime connection unavailable. Please try reconnecting.",
          })),
        );
        liveSocket.emit("join", sessionData.roomId, (ack) => {
          if (!ack?.success)
            setState((value) => ({
              ...value,
              error: ack?.error || "Unable to join the call room",
            }));
          else
            setState((value) => ({
              ...value,
              loading: false,
              status: "Waiting for the other participant…",
              quality: sessionData.networkTier || "unknown",
            }));
        });
        const sendQuality = async () => {
          const started = performance.now();
          try {
            await fetch(`${API}/api/health`, { cache: "no-store" });
            const rttMs = Math.round(performance.now() - started);
            liveSocket.emit(
              "quality:update",
              { roomId: sessionData.roomId, rttMs, packetLossPercent: 0 },
              (result) => {
                if (result?.success)
                  setState((value) => ({
                    ...value,
                    quality: result.tier,
                    rttMs: result.rttMs,
                    packetLossPercent: result.packetLossPercent,
                  }));
              },
            );
          } catch {
            setState((value) => ({
              ...value,
              quality: "very_poor",
              rttMs: 1000,
              packetLossPercent: 15,
            }));
          }
        };
        qualityTimer.current = window.setInterval(sendQuality, 5000);
        sendQuality();
        const flushCandidates = async () => {
          while (pendingCandidates.current.length)
            await connection.addIceCandidate(pendingCandidates.current.shift());
        };
        const offer = async () => {
          const description = await connection.createOffer();
          await connection.setLocalDescription(description);
          liveSocket.emit("offer", {
            roomId: sessionData.roomId,
            offer: description,
          });
        };
        liveSocket.on("peer-joined", offer);
        liveSocket.on("offer", async ({ offer }) => {
          await connection.setRemoteDescription(
            new RTCSessionDescription(offer),
          );
          await flushCandidates();
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          liveSocket.emit("answer", { roomId: sessionData.roomId, answer });
        });
        liveSocket.on("answer", async ({ answer }) => {
          await connection.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
          await flushCandidates();
        });
        liveSocket.on("ice-candidate", async ({ candidate }) => {
          if (!candidate) return;
          if (connection.remoteDescription)
            await connection
              .addIceCandidate(new RTCIceCandidate(candidate))
              .catch(() => {});
          else pendingCandidates.current.push(new RTCIceCandidate(candidate));
        });
        liveSocket.on("quality:changed", (quality) =>
          setState((value) => ({ ...value, quality: quality.tier })),
        );
        liveSocket.on("call:ended", () => {
          setState((value) => ({
            ...value,
            status: "The consultation has ended.",
          }));
          stop();
        });
      } catch (error) {
        if (!disposed)
          setState((value) => ({
            ...value,
            loading: false,
            error: error.message,
          }));
      }
    }
    start();
    return () => {
      disposed = true;
      window.clearInterval(qualityTimer.current);
      stop();
    };
  }, [appointment._id, appointment.id, role, session.token]);
  function setTrack(kind, enabled) {
    stream.current
      ?.getTracks()
      .filter((track) => track.kind === kind)
      .forEach((track) => {
        track.enabled = enabled;
      });
  }
  async function end() {
    try {
      if (callRef.current)
        await request(
          `/api/doctors/calls/${callRef.current.callId}/end`,
          session.token,
          { method: "POST", body: JSON.stringify({ reason: "normal" }) },
        );
    } finally {
      onClose();
    }
  }
  async function submitVitals(event) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      await request(
        `/api/doctors/calls/${callRef.current.callId}/vitals`,
        session.token,
        {
          method: "POST",
          body: JSON.stringify({
            temperatureC: Number(form.get("temperatureC")),
            heartRateBpm: Number(form.get("heartRateBpm")),
            oxygenSaturationPercent: Number(
              form.get("oxygenSaturationPercent"),
            ),
            source: role === "doctor" ? "doctor" : "patient",
          }),
        },
      );
      setShowVitals(false);
      setState((value) => ({
        ...value,
        status: "Vitals shared with the care team.",
      }));
    } catch (error) {
      setState((value) => ({ ...value, error: error.message }));
    }
  }
  function shareLocation() {
    if (!navigator.geolocation) {
      setState((value) => ({
        ...value,
        error: "Location is not supported by this browser.",
      }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await request("/api/portal/patient/location", session.token, {
            method: "POST",
            body: JSON.stringify({
              consultationId: callRef.current.consultationId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
              consent: true,
            }),
          });
          setState((value) => ({
            ...value,
            status:
              "Your current location is shared with your assigned doctor for this consultation only.",
          }));
        } catch (error) {
          setState((value) => ({ ...value, error: error.message }));
        }
      },
      () =>
        setState((value) => ({
          ...value,
          error: "Location permission was not granted.",
        })),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  return (
    <div className="call-screen">
      <header>
        <div>
          <span className="live-dot">
            ● {state.remote ? "Live consultation" : "Secure waiting room"}
          </span>
          <h2>
            {appointment.doctor?.name ||
              care?.patient?.name ||
              (role === "doctor" ? "Patient consultation" : "Your doctor")}
          </h2>
          <p>{qualityText[state.quality] || qualityText.unknown}</p>
        </div>
        <button
          className="button button-soft"
          onClick={() => window.location.reload()}
        >
          Reconnect
        </button>
      </header>
      <main>
        <div className="remote-video">
          {state.loading && <span>{state.status}</span>}
          <video
            ref={remoteVideo}
            autoPlay
            playsInline
            className={state.remote ? "video-on" : "video-off"}
            aria-label="Remote participant video"
          />
          <video
            ref={localVideo}
            autoPlay
            muted
            playsInline
            className="local-video"
            aria-label="Your video preview"
          />
        </div>
        <aside>
          <h3>Call status</h3>
          <p>{state.status}</p>
          <p>
            <b>Connection:</b>{" "}
            {qualityText[state.quality] || qualityText.unknown}
          </p>
          {role === "doctor" && care && (
            <div className="clinical-summary">
              <b>Patient care summary</b>
              <span>Vitals: {care.vitals?.length || 0} record(s)</span>
              <span>Reports: {care.reports?.length || 0}</span>
              {care.location && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${care.location.latitude}&mlon=${care.location.longitude}#map=16/${care.location.latitude}/${care.location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open consented patient location ↗
                </a>
              )}
            </div>
          )}
          {state.error && <p className="call-error">{state.error}</p>}
          <button
            className="button button-soft"
            onClick={() => setShowVitals(true)}
          >
            Submit vitals
          </button>
          {role === "patient" && (
            <button className="button button-soft" onClick={shareLocation}>
              Share location with doctor
            </button>
          )}
        </aside>
      </main>
      <footer>
        <button
          onClick={() => {
            const enabled = !state.mic;
            setTrack("audio", enabled);
            setState({ ...state, mic: enabled });
          }}
        >
          {state.mic ? "🎙 Mute" : "🎙 Unmute"}
        </button>
        <button
          onClick={() => {
            const enabled = !state.camera;
            setTrack("video", enabled);
            setState({ ...state, camera: enabled });
          }}
        >
          {state.camera ? "📷 Camera off" : "📷 Camera on"}
        </button>
        <button className="end-call" onClick={end}>
          End consultation
        </button>
      </footer>
      {showVitals && (
        <div className="modal-backdrop">
          <form className="modal form" onSubmit={submitVitals}>
            <h2>Share vitals</h2>
            <label>
              Temperature (°C)
              <input
                name="temperatureC"
                type="number"
                min="20"
                max="50"
                step="0.1"
                required
              />
            </label>
            <label>
              Heart rate (bpm)
              <input
                name="heartRateBpm"
                type="number"
                min="0"
                max="300"
                required
              />
            </label>
            <label>
              Oxygen saturation (%)
              <input
                name="oxygenSaturationPercent"
                type="number"
                min="0"
                max="100"
                required
              />
            </label>
            <div className="actions">
              <button className="button button-green">Submit</button>
              <button
                type="button"
                className="button button-soft"
                onClick={() => setShowVitals(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
