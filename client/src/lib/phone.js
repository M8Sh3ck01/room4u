export const normalizePhone = (raw) => String(raw || '').replace(/[\s-]/g, '');

export const isValidPhone = (raw) => /^(0|\+265)[89]\d{8}$/.test(normalizePhone(raw));

export const PHONE_HINT = 'We text you about the move-in date.';
