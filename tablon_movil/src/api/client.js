import * as SecureStore from 'expo-secure-store';

//Cambia esto por la IP de tu servidor
export const BASE = 'http://192.168.1.85';

const TOKEN_KEY = 'tablon_token';

export const saveToken = (token) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const removeToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

const authFetch = async (url, opts = {}) => {
  const token = await getToken();
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error');
  }
  return res.status === 204 ? null : res.json();
};
export const apiLogin = async (email, password) => {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${res.status}`);
    }
    return res.json();
  } catch (e) {
    throw new Error(`Login failed: ${e.message}`);
  }
};


export const apiMe = () => authFetch('/api/auth/me');
export const apiGetChannels = () => authFetch('/api/channels');
export const apiGetMessages = (subchannelId, page = 1) =>
  authFetch(`/api/subchannels/${subchannelId}/messages?page=${page}&page_size=50`);
export const apiSendMessage = (subchannelId, text, file) =>
  authFetch(`/api/subchannels/${subchannelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text, file_url: file?.url, file_name: file?.name, file_size: file?.size }),
  });
export const apiDeleteMessage = (id) => authFetch(`/api/messages/${id}`, { method: 'DELETE' });
export const apiToggleReaction = (id, emoji) =>
  authFetch(`/api/messages/${id}/reactions?emoji=${encodeURIComponent(emoji)}`, { method: 'POST' });
export const apiGetMentionables = () => authFetch('/api/users/mentionables');

export const openWebSocket = async (subchannelId, onMessage) => {
  const token = await getToken();
  const wsBase = BASE.replace(/^http/, 'ws');
  const ws = new WebSocket(`${wsBase}/api/ws/${subchannelId}?token=${token}`);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch (_) {}
  };
  ws.onerror = (e) => console.error('WS error', e);
  return ws;
};
