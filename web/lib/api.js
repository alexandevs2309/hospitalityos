import { getStoredToken, getStoredRefreshToken, storeAuth, clearAuth } from "./auth";

const API_BASE = "/api";

async function refreshToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    clearAuth();
    throw new Error("Token expired");
  }
const data = await res.json();
    let user = {};
    try { user = JSON.parse(localStorage.getItem("hos_user") || "{}"); } catch {}
    storeAuth(data.access_token, data.refresh_token, user);
    return data.access_token;
}

async function request(path, options = {}) {
  const { tenantId, token: explicitToken, headers: extraHeaders, ...fetchOpts } = options;

  async function doRequest(token) {
    return fetch(`${API_BASE}${path}`, {
      ...fetchOpts,
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantId || "eden-hotel",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(explicitToken ? { Authorization: `Bearer ${explicitToken}` } : {}),
        ...(extraHeaders || {}),
      },
    });
  }

  let token = getStoredToken();
  let res = await doRequest(token);

  if (res.status === 401 && !explicitToken) {
    try {
      token = await refreshToken();
      res = await doRequest(token);
    } catch {
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Sesión expirada");
    }
  }

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

export function createPaymentIntent(data, tenantId) {
  return request("/payments/intent", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function listWhatsAppMessages(tenantId, reservationId) {
  const qs = reservationId ? `?reservation_id=${reservationId}` : "";
  return request(`/whatsapp/messages${qs}`, { tenantId });
}

export function sendWhatsAppMessage(data, tenantId) {
  return request("/whatsapp/send", {
    method: "POST",
    body: JSON.stringify(data),
    tenantId,
  });
}

export function getCRMSegments(tenantId) {
  return request("/crm/segments", { tenantId });
}

export function listCRMGuests(tenantId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/crm/guests${qs ? "?" + qs : ""}`, { tenantId });
}

export function getGuestStayHistory(guestId, tenantId) {
  return request(`/crm/guests/history?guest_id=${encodeURIComponent(guestId)}`, { tenantId });
}

export function getGuestCommunications(guestId, tenantId) {
  return request(`/crm/guests/communications?guest_id=${encodeURIComponent(guestId)}`, { tenantId });
}

export function generatePortalToken(reservationId, tenantId) {
  return request("/portal/tokens", {
    method: "POST",
    body: JSON.stringify({ reservation_id: reservationId }),
    tenantId,
  });
}

export function getPortalData(token) {
  return fetch(`/v1/portal/${token}`).then(r => r.json());
}

export function portalSelfCheckIn(token) {
  return fetch(`/v1/portal/${token}/check-in`, { method: "POST" }).then(r => r.json());
}

export function portalSelfCheckOut(token) {
  return fetch(`/v1/portal/${token}/check-out`, { method: "POST" }).then(r => r.json());
}

export function portalCreateRequest(token, data) {
  return fetch(`/v1/portal/${token}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(r => r.json());
}

export function portalSubmitReview(token, data) {
  return fetch(`/v1/portal/${token}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(r => r.json());
}

export function listPOSCategories(tenantId) {
  return request("/pos/categories", { tenantId });
}

export function createPOSCategory(data, tenantId) {
  return request("/pos/categories", {
    method: "POST", body: JSON.stringify(data), tenantId,
  });
}

export function listPOSItems(tenantId, categoryId) {
  const qs = categoryId ? `?category_id=${categoryId}` : "";
  return request(`/pos/items${qs}`, { tenantId });
}

export function createPOSItem(data, tenantId) {
  return request("/pos/items", {
    method: "POST", body: JSON.stringify(data), tenantId,
  });
}

export function createPOSOrder(data, tenantId) {
  return request("/pos/orders", {
    method: "POST", body: JSON.stringify(data), tenantId,
  });
}

export function getPOSOrder(id, tenantId) {
  return request(`/pos/orders/${id}`, { tenantId });
}

export function chargePOSOrderToFolio(id, data, tenantId) {
  return request(`/pos/orders/${id}/charge`, {
    method: "POST", body: JSON.stringify(data), tenantId,
  });
}

export function getPOSDashboard(tenantId) {
  return request("/pos/dashboard", { tenantId });
}

export function listEvents(tenantId) {
  return request("/events", { tenantId });
}

export function createEvent(data, tenantId) {
  return request("/events", {
    method: "POST", body: JSON.stringify(data), tenantId,
  });
}

export function updateEventStatus(id, data, tenantId) {
  return request(`/events/${id}/status`, {
    method: "PATCH", body: JSON.stringify(data), tenantId,
  });
}

export function blockEventDates(data, tenantId) {
  return request("/events/block-dates", {
    method: "POST", body: JSON.stringify(data), tenantId,
  });
}

export function getEventAvailability(startDate, endDate, tenantId) {
  return request(`/events/availability?start_date=${startDate}&end_date=${endDate}`, { tenantId });
}

export function getRevenueSuggestions(tenantId) {
  return request("/revenue/suggestions", { tenantId });
}

export function getRevenueForecast(tenantId) {
  return request("/revenue/forecast", { tenantId });
}

export function applySeasonPrice(data, tenantId) {
  return request("/revenue/apply-price", {
    method: "POST", body: JSON.stringify(data), tenantId,
  });
}

export function getTapeChart(startDate, endDate, tenantId) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return request(`/tapechart?${params.toString()}`, { tenantId });
}

export function registerHotel(data) {
  return fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(async (res) => {
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.message || "Registration failed");
    return json;
  });
}
