import { api } from './api';

export const loginWithGoogle = (id_token) =>
  api('/api/auth/google', { method: 'POST', body: JSON.stringify({ id_token }) });

export const logout = () => api('/api/auth/logout', { method: 'POST' });

export const me = () => api('/api/me');

export const updateMe = (fields) =>
  api('/api/me', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
