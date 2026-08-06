const generateChargeId = () =>
  `room4u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

async function initiate({ booking, room }) {
  const charge_id = generateChargeId();
  return {
    charge_id,
    payment_link: `https://paychangu.com/pay/${charge_id}`,
  };
}

module.exports = { initiate, generateChargeId };
