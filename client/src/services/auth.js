import { api } from './api';

const TOKEN_KEY = 'room4u_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export const login = (credentials) =>
  api('/api/auth/dev', { method: 'POST', body: JSON.stringify(credentials) });

export const loginWithGoogle = (id_token) =>
  api('/api/auth/google', { method: 'POST', body: JSON.stringify({ id_token }) });

export const me = () => api('/api/me', { headers: authHeaders() });

export const updateMe = (fields) =>
  api('/api/me', {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(fields),
  });
