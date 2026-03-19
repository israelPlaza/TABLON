export const BASE = import.meta.env.VITE_API_URL || "";

// ─── Token storage ────────────────────────────────────────────
export const getToken = () => localStorage.getItem("token");
export const setToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

// ─── Base fetch wrapper ───────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(err.detail || "Error en la petición");
  }

  if (res.status === 204) return null;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────
export const apiLogin = (email, password) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const apiMe = () => request("/api/auth/me");

// ─── Channels ─────────────────────────────────────────────────
export const apiGetChannels = () => request("/api/channels");

// ─── Messages ─────────────────────────────────────────────────
export const apiGetMessages = (subchannelId, page = 1, pageSize = 50) =>
  request(`/api/subchannels/${subchannelId}/messages?page=${page}&page_size=${pageSize}`);

export const apiSendMessage = (subchannelId, text, file) =>
  request(`/api/subchannels/${subchannelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, file_url: file?.url, file_name: file?.name, file_size: file?.size }),
  });

export const apiDeleteMessage = (messageId) =>
  request(`/api/messages/${messageId}`, { method: "DELETE" });

export const apiToggleReaction = (messageId, emoji) =>
  request(`/api/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
    method: "POST",
  });

// ─── Users (admin) ────────────────────────────────────────────
export const apiGetUsers = () => request("/api/users");

export const apiCreateUser = (name, email, password) =>
  request("/api/users", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const apiDeactivateUser = (userId) =>
  request(`/api/users/${userId}/deactivate`, { method: "PATCH" });

// ─── WebSocket ────────────────────────────────────────────────
export function openWebSocket(subchannelId, onMessage) {
  const token = getToken();
  const wsBase = BASE.replace(/^http/, "ws") || `ws://${window.location.host}`;
  const url = `${wsBase}/api/ws/${subchannelId}?token=${token}`;
  const ws = new WebSocket(url);

  ws.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      onMessage(event);
    } catch (_) {}
  };

  ws.onerror = (e) => console.error("WS error", e);

  return ws;
}

// ─── Files ────────────────────────────────────────────────────
export const apiUploadFile = async (file) => {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/api/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error subiendo archivo" }));
    throw new Error(err.detail);
  }
  return res.json();
};
