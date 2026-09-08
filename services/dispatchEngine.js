import Emergency from "../models/Emergency.js";
import TransportRequest from "../models/TransportRequest.js";
import Ambulance from "../models/Ambulance.js";
import DispatchAttempt from "../models/DispatchAttempt.js";
import { haversineKm } from "../utils/geo.js";
import { matchHospital } from "../utils/hospitalMatch.js";
import { callDriver, smsDriver } from "./twilioService.js";

const NEARBY_AMBULANCE_RADIUS_KM = 50;

const ADAPTERS = {
  emergency: {
    Model: Emergency,
    statusField: "dispatchStatus",
    getLocation: (d) => [d.latitude, d.longitude],
    searchingStatus: "searching_ambulance",
    assignedField: "vehicle_assigned",
    timestampFields: { vehicle_assigned: "vehicleAssignedAt", dispatched: "dispatchedAt" },
    emitEvent: "emergency:status_changed",
    escalateEvent: "emergency:escalated",
    newEvent: "emergency:new",
  },
  transport: {
    Model: TransportRequest,
    statusField: "status",
    getLocation: (d) => [d.pickupLatitude, d.pickupLongitude],
    searchingStatus: "searching_driver",
    assignedField: "driver_assigned",
    timestampFields: { driver_assigned: "driverAssignedAt", dispatched: "dispatchedAt" },
    emitEvent: "transport:status_changed",
    escalateEvent: "transport:escalated",
    newEvent: "transport:new",
  },
};

// Resolves the promise a running cascade loop is awaiting for a given attempt,
// so an accept/decline coming in from a completely separate HTTP request (the
// driver's Accept button, or a Twilio voice/SMS webhook) can unblock it.
const pendingResolvers = new Map();

function dispatchTimeoutMs() {
  return (Number(process.env.DISPATCH_TIMEOUT_SECONDS) || 30) * 1000;
}

function emit(io, event, payload) {
  io?.emit(event, payload);
}

function emitToDriver(io, driverId, event, payload) {
  io?.to(`driver:${driverId}`).emit(event, payload);
}

async function rankCandidateAmbulances(latitude, longitude, { onlyAvailable }) {
  const statusFilter = onlyAvailable ? ["available"] : ["available", "busy"];
  const ambulances = await Ambulance.find({
    status: { $in: statusFilter },
    "currentLocation.latitude": { $ne: null },
    "currentLocation.longitude": { $ne: null },
  }).populate("driver");

  return ambulances
    .filter((a) => a.driver)
    .map((a) => ({
      ambulance: a,
      driver: a.driver,
      distanceKm: haversineKm(latitude, longitude, a.currentLocation.latitude, a.currentLocation.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// All writes to the shared Emergency/TransportRequest document use atomic
// $set updates (never a stale in-memory .save()) because this engine runs
// fire-and-forget alongside the existing manual admin dispatch console — two
// concurrent full-document saves on the same doc would silently clobber
// each other's fields.
async function setFields(adapter, requestId, fields) {
  return adapter.Model.findByIdAndUpdate(requestId, { $set: fields }, { new: true });
}

async function autoAssignAmbulance(adapter, kind, requestId, ambulance, distanceKm, io) {
  ambulance.status = "dispatched";
  await ambulance.save();

  let updated = await setFields(adapter, requestId, {
    assignedVehicle: ambulance._id,
    [adapter.statusField]: "dispatched",
    [adapter.timestampFields[adapter.assignedField]]: new Date(),
    [adapter.timestampFields.dispatched]: new Date(),
  });

  await DispatchAttempt.create({
    requestType: kind,
    requestId,
    driver: ambulance.driver,
    ambulance: ambulance._id,
    channel: ["app"],
    status: "accepted",
    distanceKm: Number(distanceKm.toFixed(2)),
    respondedAt: new Date(),
    respondedVia: "app",
    note: "Auto-assigned: ambulance already available nearby",
  });

  if (kind === "emergency" && updated) {
    const match = await matchHospital(updated.latitude, updated.longitude, {
      emergencyType: updated.emergencyType,
      severity: updated.severity,
    });
    if (match) {
      updated = await setFields(adapter, requestId, {
        selectedHospital: match.hospital._id,
        hospitalAlertedAt: new Date(),
      });
    }
  }

  emit(io, adapter.emitEvent, { id: requestId, status: updated?.[adapter.statusField] });
  return updated;
}

function waitForResponse(attemptId) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingResolvers.delete(String(attemptId));
      resolve({ decision: "timeout", respondedVia: null });
    }, dispatchTimeoutMs());
    pendingResolvers.set(String(attemptId), (decision, respondedVia) => {
      clearTimeout(timer);
      resolve({ decision, respondedVia });
    });
  });
}

async function runCascade(adapter, kind, requestId, candidates, io) {
  for (const { ambulance, driver, distanceKm } of candidates) {
    // Bail out if the request was already resolved elsewhere (e.g. an admin
    // manually assigned a vehicle through the legacy console) while we were
    // mid-cascade on a previous candidate.
    const fresh = await adapter.Model.findById(requestId);
    if (!fresh || fresh.assignedVehicle || !["pending", adapter.searchingStatus].includes(fresh[adapter.statusField])) {
      return;
    }

    const attempt = await DispatchAttempt.create({
      requestType: kind,
      requestId,
      driver: driver._id,
      ambulance: ambulance._id,
      channel: ["app", "call", "sms"],
      status: "ringing",
      distanceKm: Number(distanceKm.toFixed(2)),
    });

    const offerPayload = {
      attemptId: attempt._id,
      requestType: kind,
      requestId,
      distanceKm: attempt.distanceKm,
      expiresInSeconds: dispatchTimeoutMs() / 1000,
      emergencyType: fresh.emergencyType,
      severity: fresh.severity,
      title: fresh.title,
    };
    emitToDriver(io, driver._id, "dispatch:offer", offerPayload);

    const [callSid, smsSid] = await Promise.all([
      callDriver(driver, attempt, { kind, title: fresh.title, severity: fresh.severity, emergencyType: fresh.emergencyType }),
      smsDriver(driver, attempt, { kind, title: fresh.title, severity: fresh.severity, emergencyType: fresh.emergencyType }),
    ]);
    if (callSid) attempt.twilioCallSid = callSid;
    if (smsSid) attempt.twilioSmsSid = smsSid;
    if (callSid || smsSid) await attempt.save();

    const { decision, respondedVia } = await waitForResponse(attempt._id);

    if (decision === "accept") {
      attempt.status = "accepted";
      attempt.respondedAt = new Date();
      attempt.respondedVia = respondedVia || "app";
      await attempt.save();
      await autoAssignAmbulance(adapter, kind, requestId, ambulance, distanceKm, io);
      emitToDriver(io, driver._id, "dispatch:offer:resolved", { attemptId: attempt._id, outcome: "accepted" });
      return;
    }

    attempt.status = decision === "decline" ? "declined" : "timeout";
    if (decision === "decline") {
      attempt.respondedAt = new Date();
      attempt.respondedVia = respondedVia || "app";
    }
    await attempt.save();
    emitToDriver(io, driver._id, "dispatch:offer:resolved", { attemptId: attempt._id, outcome: attempt.status });
  }

  // Cascade exhausted every candidate with no acceptance.
  const stillOpen = await adapter.Model.findById(requestId);
  if (stillOpen && !stillOpen.assignedVehicle) {
    await setFields(adapter, requestId, { escalatedToControlRoom: true });
    emit(io, adapter.escalateEvent, { id: requestId });
  }
}

export async function startDispatch(kind, requestDoc, io) {
  const adapter = ADAPTERS[kind];
  if (!adapter) throw new Error(`Unknown dispatch kind: ${kind}`);

  const requestId = requestDoc._id;
  const [lat, lng] = adapter.getLocation(requestDoc);
  emit(io, adapter.newEvent, { id: requestId });

  try {
    const nearbyAvailable = await rankCandidateAmbulances(lat, lng, { onlyAvailable: true });
    const withinRadius = nearbyAvailable.filter((c) => c.distanceKm <= NEARBY_AMBULANCE_RADIUS_KM);

    if (withinRadius.length) {
      await autoAssignAmbulance(adapter, kind, requestId, withinRadius[0].ambulance, withinRadius[0].distanceKm, io);
      return;
    }

    await setFields(adapter, requestId, { [adapter.statusField]: adapter.searchingStatus });
    emit(io, adapter.emitEvent, { id: requestId, status: adapter.searchingStatus });

    const candidates = await rankCandidateAmbulances(lat, lng, { onlyAvailable: false });
    if (!candidates.length) {
      await setFields(adapter, requestId, { escalatedToControlRoom: true });
      emit(io, adapter.escalateEvent, { id: requestId, reason: "no_registered_drivers" });
      return;
    }

    await runCascade(adapter, kind, requestId, candidates, io);
  } catch (error) {
    console.error(`[dispatchEngine] startDispatch(${kind}) failed:`, error);
  }
}

// Called by the driver's Accept/Reject button and by the Twilio voice/SMS
// webhooks — the single funnel every acceptance channel goes through.
export async function respondToDispatch(attemptId, decision, respondedVia = "app") {
  const attempt = await DispatchAttempt.findById(attemptId);
  if (!attempt) return { ok: false, reason: "not_found" };
  if (attempt.status !== "ringing") return { ok: false, reason: "already_resolved", status: attempt.status };

  const resolver = pendingResolvers.get(String(attemptId));
  pendingResolvers.delete(String(attemptId));

  if (resolver) {
    resolver(decision === "accept" ? "accept" : "decline", respondedVia);
    return { ok: true };
  }

  // The cascade already moved on (timed out) before this response arrived.
  attempt.status = decision === "accept" ? "accepted" : "declined";
  attempt.respondedAt = new Date();
  attempt.respondedVia = respondedVia;
  attempt.note = (attempt.note ? attempt.note + " " : "") + "Late response after cascade had already moved on.";
  await attempt.save();
  return { ok: true, late: true };
}
