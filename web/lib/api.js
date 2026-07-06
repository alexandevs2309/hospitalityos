const API_BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-ID": options.tenantId || "default",
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
