import Hospital from "../models/Hospital.js";
import { haversineKm } from "./geo.js";

const CRITICAL_FACILITIES = ["ICU", "Trauma Care", "Emergency 24/7"];
const TYPE_PREFERENCE = { district: 3, "sub-district": 2, chc: 1, private: 1, phc: 0, government: 1 };

// Ranks active hospitals by distance, with a bonus for facilities/type suited to the
// incident's severity/type. Always returns the best match rather than nothing, since a
// real dispatch can never be left without *some* destination hospital.
export async function matchHospital(latitude, longitude, { emergencyType, severity } = {}) {
  const hospitals = await Hospital.find({ isActive: true });
  if (!hospitals.length) return null;

  const needsCriticalCare = severity === "critical" || severity === "high" || emergencyType === "trauma" || emergencyType === "accident";

  const scored = hospitals.map((h) => {
    const distanceKm = haversineKm(latitude, longitude, h.latitude, h.longitude);
    let score = -distanceKm; // closer is better
    if (needsCriticalCare) {
      const hasCriticalFacility = (h.facilities || []).some((f) => CRITICAL_FACILITIES.includes(f));
      if (hasCriticalFacility) score += 25;
    }
    score += TYPE_PREFERENCE[h.type] || 0;
    return { hospital: h, distanceKm, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return { hospital: best.hospital, distanceKm: Number(best.distanceKm.toFixed(2)) };
}
