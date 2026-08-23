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

export function getGuestProfile(id, tenantId) {
  return request(`/guests/${id}/profile`, { tenantId });
}

export function addGuestPreference(id, data, tenantId) {
  return request(`/guests/${id}/preferences`, {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function addGuestTag(id, tag, tenantId) {
  return request(`/guests/${id}/tags`, {
    method: "POST",
    body: JSON.stringify({ tag }),
    tenantId,
  });
}

export function removeGuestTag(id, tag, tenantId) {
  return request(`/guests/${id}/tags/${encodeURIComponent(tag)}`, {
    method: "DELETE",
    tenantId,
  });
}

export function getFrontDeskToday(tenantId) {
  return request("/frontdesk/today", { tenantId });
}

export function getFolio(reservationId, tenantId) {
  return request(`/reservations/${reservationId}/folio`, { tenantId });
}

export function addFolioEntry(reservationId, data, tenantId) {
  return request(`/reservations/${reservationId}/folio/entries`, {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function closeFolio(reservationId, data, tenantId) {
  return request(`/reservations/${reservationId}/folio/close`, {
    method: "POST",
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export function getPaymentReceipt(paymentId, tenantId) {
  return request(`/payments/${paymentId}/receipt`, { tenantId });
}

export function listPayments(tenantId, reservationId) {
  const qs = reservationId ? `?reservation_id=${reservationId}` : "";
  return request(`/payments${qs}`, { tenantId });
}

export function createPayment(data, tenantId) {
  return request("/payments", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function listHousekeepingTasks(tenantId, status) {
  const qs = status ? `?status=${status}` : "";
  return request(`/housekeeping/tasks${qs}`, { tenantId });
}

export function createHousekeepingTask(data, tenantId) {
  return request("/housekeeping/tasks", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function updateHousekeepingTaskStatus(id, data, tenantId) {
  return request(`/housekeeping/tasks/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function listStaff(tenantId) {
  return request("/staff", { tenantId });
}

export function createStaff(data, tenantId) {
  return request("/staff", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function updateStaffRole(id, role, tenantId) {
  return request(`/staff/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
    tenantId,
  });
}

export function listMaintenanceRequests(tenantId, status) {
  const qs = status ? `?status=${status}` : "";
  return request(`/maintenance${qs}`, { tenantId });
}

export function createMaintenanceRequest(data, tenantId) {
  return request("/maintenance", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function updateMaintenanceRequestStatus(id, data, tenantId) {
  return request(`/maintenance/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function runNightAudit(tenantId, runDate) {
  return request("/night-audit/run", {
    method: "POST",
    body: JSON.stringify({ run_date: runDate }),
    tenantId,
  });
}

export function getNightAuditHistory(tenantId, limit) {
  const qs = limit ? `?limit=${limit}` : "";
  return request(`/night-audit/history${qs}`, { tenantId });
}

export function getReportDashboard(tenantId) {
  return request("/reports/dashboard", { tenantId });
}

export function getReportOccupancy(tenantId, days) {
  const qs = days ? `?days=${days}` : "";
  return request(`/reports/occupancy${qs}`, { tenantId });
}

export function getReportRevenue(tenantId, days) {
  const qs = days ? `?days=${days}` : "";
  return request(`/reports/revenue${qs}`, { tenantId });
}

export function getReportGuestStats(tenantId) {
  return request("/reports/guest-stats", { tenantId });
}

export function listFiscalReceipts(tenantId) {
  return request("/fiscal/receipts", { tenantId });
}

export function createFiscalReceipt(data, tenantId) {
  return request("/fiscal/receipts", {
    method: "POST",
    body: JSON.stringify({
      reservation_id: data.reservation_id,
      rnc: data.rnc,
      ncf_type: data.ncf_type,
      forma_pago: data.forma_pago || "efectivo",
    }),
    tenantId,
  });
}

export function validateRNC(rnc, tenantId) {
  return request(`/fiscal/validate-rnc?rnc=${encodeURIComponent(rnc)}`, { tenantId });
}

export function getFiscalSummary(tenantId) {
  return request("/fiscal/summary", { tenantId });
}
