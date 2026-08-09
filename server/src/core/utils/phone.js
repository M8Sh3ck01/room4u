const MWK_MOBILE_NATIONAL = /^0[89]\d{8}$/;
const MWK_MOBILE_INTERNATIONAL = /^\+265[89]\d{8}$/;

function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const compact = raw.replace(/[\s-]/g, '');
  if (MWK_MOBILE_INTERNATIONAL.test(compact)) return `0${compact.slice(4)}`;
  if (MWK_MOBILE_NATIONAL.test(compact)) return compact;
  return null;
}

module.exports = { normalizePhone };
