import { api } from './api';

export const CLAIM_STORAGE_KEY = 'room4u_active_claim';

export const getCachedClaim = (roomId) => {
  let raw = null;
  try {
    raw = sessionStorage.getItem(CLAIM_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.bookingId) return null;
    if (roomId && parsed.roomId !== roomId) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const makeIdempotencyKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const claimRoom = (roomId, idempotencyKey) =>
  api(`/api/rooms/${roomId}/claims`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
  }).then((res) => res.data);

export const getBooking = (id) =>
  api(`/api/bookings/${id}`).then((res) => res.data.booking);

export const cancelBooking = (id) =>
  api(`/api/bookings/${id}/cancel`, { method: 'POST' }).then(
    (res) => res.data.booking
  );

export const simulatePayment = (bookingId) =>
  api(`/api/dev/bookings/${bookingId}/simulate-payment`, {
    method: 'POST',
  }).then((res) => res.data);
