const config = require('@config');

const EARTH_RADIUS_KM = 6371;
const SPEED_MIN_PER_KM = 12;
const DETOUR_FACTOR = 1.25;

const toRadians = (deg) => (deg * Math.PI) / 180;

function haversineKm(fromLat, fromLng, toLat, toLng) {
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

const walkMinutes = (distKm) => Math.round(distKm * SPEED_MIN_PER_KM * DETOUR_FACTOR);

function distanceFromCampus(hostel) {
  if (!hostel || typeof hostel.lat !== 'number' || typeof hostel.lng !== 'number') return null;
  return haversineKm(config.campus.lat, config.campus.lng, hostel.lat, hostel.lng);
}

function directionsUrl(hostel) {
  if (!hostel || typeof hostel.lat !== 'number' || typeof hostel.lng !== 'number') return null;
  const origin = `${config.campus.lat},${config.campus.lng}`;
  const destination = `${hostel.lat},${hostel.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
}

module.exports = { haversineKm, walkMinutes, distanceFromCampus, directionsUrl };
