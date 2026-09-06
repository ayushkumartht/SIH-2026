export const NETWORK_TIERS = Object.freeze([
  "unknown",
  "hd",
  "low_res",
  "audio_only",
  "very_poor",
]);

const TIER_PROFILES = Object.freeze({
  unknown: {
    videoEnabled: true,
    audioEnabled: true,
    maxVideoQuality: "720p",
    fallbackRequired: false,
  },
  hd: {
    videoEnabled: true,
    audioEnabled: true,
    maxVideoQuality: "720p",
    fallbackRequired: false,
  },
  low_res: {
    videoEnabled: true,
    audioEnabled: true,
    maxVideoQuality: "360p",
    fallbackRequired: false,
  },
  audio_only: {
    videoEnabled: false,
    audioEnabled: true,
    maxVideoQuality: "180p",
    fallbackRequired: false,
  },
  very_poor: {
    videoEnabled: false,
    audioEnabled: false,
    maxVideoQuality: "180p",
    fallbackRequired: true,
  },
});

function parseMetric(value, name) {
  const metric = Number(value);
  if (!Number.isFinite(metric) || metric < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return metric;
}

export function validateNetworkMetrics({ rttMs, packetLossPercent } = {}) {
  if (rttMs === undefined || packetLossPercent === undefined) {
    throw new Error("rttMs and packetLossPercent are required");
  }

  const validatedRttMs = parseMetric(rttMs, "rttMs");
  const validatedPacketLossPercent = parseMetric(packetLossPercent, "packetLossPercent");

  if (validatedPacketLossPercent > 100) {
    throw new Error("packetLossPercent must be between 0 and 100");
  }

  return {
    rttMs: validatedRttMs,
    packetLossPercent: validatedPacketLossPercent,
  };
}

export function getNetworkProfile(tier) {
  if (!NETWORK_TIERS.includes(tier)) {
    throw new Error(`Invalid network tier: ${tier}`);
  }
  return { tier, ...TIER_PROFILES[tier] };
}

export function calculateNetworkQuality(metrics) {
  const { rttMs, packetLossPercent } = validateNetworkMetrics(metrics);
  let tier = "very_poor";

  if (rttMs <= 150 && packetLossPercent <= 2) {
    tier = "hd";
  } else if (rttMs <= 300 && packetLossPercent <= 5) {
    tier = "low_res";
  } else if (rttMs <= 600 && packetLossPercent <= 10) {
    tier = "audio_only";
  }

  return {
    ...getNetworkProfile(tier),
    rttMs,
    packetLossPercent,
  };
}

export function resolveInitialNetworkQuality({ networkTier, rttMs, packetLossPercent } = {}) {
  const hasMetrics = rttMs !== undefined || packetLossPercent !== undefined;

  if (hasMetrics) {
    return calculateNetworkQuality({ rttMs, packetLossPercent });
  }

  if (networkTier !== undefined) {
    return getNetworkProfile(networkTier);
  }

  return getNetworkProfile("unknown");
}