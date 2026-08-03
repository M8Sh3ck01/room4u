import { api } from './api';

const qs = (params) => {
  const search = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return search ? `?${search}` : '';
};

export const listRooms = (params) =>
  api(`/api/rooms${qs(params)}`).then((res) => res.data.rooms);

export const getRoom = (id) => api(`/api/rooms/${id}`).then((res) => res.data.room);

export const listAreas = () => api('/api/areas').then((res) => res.data.areas);
