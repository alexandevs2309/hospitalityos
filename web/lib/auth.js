const API_BASE = "/api";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hos_access_token");
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hos_refresh_token");
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("hos_user");
  return raw ? JSON.parse(raw) : null;
}

export function storeAuth(accessToken, refreshToken, user) {
  localStorage.setItem("hos_access_token", accessToken);
  localStorage.setItem("hos_refresh_token", refreshToken);
  localStorage.setItem("hos_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("hos_access_token");
  localStorage.removeItem("hos_refresh_token");
  localStorage.removeItem("hos_user");
}

export async function loginUser(email, password, tenantId) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, tenant_id: tenantId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Credenciales incorrectas" } }));
    throw new Error(err.error?.message || "Credenciales incorrectas");
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Token expired");
  return res.json();
}
