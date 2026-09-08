// Shared status state-machines for Emergency (dispatchStatus) and TransportRequest
// (status), used by both the admin-facing emergency controller and the
// driver-facing controller so the two never fall out of sync.

export const EMERGENCY_TRANSITIONS = {
  pending: ["searching_ambulance", "vehicle_assigned", "cancelled"],
  searching_ambulance: ["vehicle_assigned", "cancelled"],
  vehicle_assigned: ["dispatched", "cancelled"],
  dispatched: ["en_route", "cancelled"],
  en_route: ["arrived", "cancelled"],
  arrived: ["at_hospital", "cancelled"],
  at_hospital: ["handed_over"],
  handed_over: ["closed"],
  cancelled: [],
  closed: [],
};

export const EMERGENCY_TIMESTAMP_FIELD = {
  vehicle_assigned: "vehicleAssignedAt",
  dispatched: "dispatchedAt",
  en_route: "enRouteAt",
  arrived: "arrivedAt",
  at_hospital: "atHospitalAt",
  handed_over: "handoverAt",
  closed: "closedAt",
  cancelled: "cancelledAt",
};

export const TRANSPORT_TRANSITIONS = {
  requested: ["searching_driver", "driver_assigned", "cancelled"],
  searching_driver: ["driver_assigned", "cancelled"],
  driver_assigned: ["dispatched", "cancelled"],
  dispatched: ["en_route", "cancelled"],
  en_route: ["arrived", "cancelled"],
  arrived: ["completed"],
  completed: [],
  cancelled: [],
};

export const TRANSPORT_TIMESTAMP_FIELD = {
  driver_assigned: "driverAssignedAt",
  dispatched: "dispatchedAt",
  en_route: "enRouteAt",
  arrived: "arrivedAt",
  completed: "completedAt",
  cancelled: "cancelledAt",
};
