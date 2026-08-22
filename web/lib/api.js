const API_BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-ID": options.tenantId || "eden-hotel",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function checkAvailability(checkIn, checkOut, tenantId) {
  return request(`/availability?check_in=${checkIn}&check_out=${checkOut}`, { tenantId });
}

export function listReservations(tenantId, status) {
  const qs = status ? `?status=${status}` : "";
  return request(`/reservations${qs}`, { tenantId });
}

export function getReservation(id, tenantId) {
  return request(`/reservations/${id}`, { tenantId });
}

export function createReservation(data, tenantId) {
  return request("/reservations", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function cancelReservation(reservationId, tenantId) {
  return request("/reservations/cancel", {
    method: "POST",
    body: JSON.stringify({ reservation_id: reservationId }),
    tenantId,
  });
}

export function checkInReservation(id, tenantId) {
  return request(`/reservations/${id}/check-in`, {
    method: "POST",
    tenantId,
  });
}

export function checkOutReservation(id, tenantId) {
  return request(`/reservations/${id}/check-out`, {
    method: "POST",
    tenantId,
  });
}

export function listRooms(tenantId, status) {
  const qs = status ? `?status=${status}` : "";
  return request(`/rooms${qs}`, { tenantId });
}

export function getRoom(id, tenantId) {
  return request(`/rooms/${id}`, { tenantId });
}

export function createRoom(data, tenantId) {
  return request("/rooms", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function updateRoomStatus(id, status, tenantId) {
  return request(`/rooms/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    tenantId,
  });
}

export function listRoomTypes(tenantId) {
  return request("/room-types", { tenantId });
}

export function createRoomType(data, tenantId) {
  return request("/room-types", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function listRates(tenantId) {
  return request("/rates", { tenantId });
}

export function createRate(data, tenantId) {
  return request("/rates", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function listGuests(tenantId, search) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return request(`/guests${qs}`, { tenantId });
}

export function getGuest(id, tenantId) {
  return request(`/guests/${id}`, { tenantId });
}

export function createGuest(data, tenantId) {
  return request("/guests", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}
