// ─── Añadir estas funciones a src/api/client.js ──────────────

export const apiCreateChannel = (name, icon, color) =>
  request("/api/channels", {
    method: "POST",
    body: JSON.stringify({ name, icon, color }),
  });

export const apiUpdateChannel = (channelId, data) =>
  request(`/api/channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const apiDeleteChannel = (channelId) =>
  request(`/api/channels/${channelId}`, { method: "DELETE" });

export const apiCreateSubchannel = (channelId, name, icon) =>
  request(`/api/channels/${channelId}/subchannels`, {
    method: "POST",
    body: JSON.stringify({ name, icon }),
  });

export const apiUpdateSubchannel = (channelId, subId, data) =>
  request(`/api/channels/${channelId}/subchannels/${subId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const apiDeleteSubchannel = (channelId, subId) =>
  request(`/api/channels/${channelId}/subchannels/${subId}`, { method: "DELETE" });
