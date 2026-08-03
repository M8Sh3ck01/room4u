const mongoose = require('mongoose');

const Room = require('./room.model');
const Hostel = require('@modules/directories/hostel.model');
const { distanceFromCampus, walkMinutes, directionsUrl } = require('@shared/services/distance');

const populate = [{ path: 'hostel_id', populate: { path: 'area_id', model: 'Area' } }];

const round1 = (n) => Math.round(n * 10) / 10;

const toDateString = (d) => (d ? d.toISOString().slice(0, 10) : null);

function serializeRoom(room, { detail = false } = {}) {
  const hostel = room.hostel_id;
  const area = hostel && hostel.area_id;
  const dist_km = hostel ? distanceFromCampus(hostel) : null;

  const out = {
    id: room.id,
    photos: room.photos,
    hostel: hostel ? hostel.name : '',
    area: area ? area.name : '',
    type: room.type,
    beds: room.beds,
    beds_left: room.beds_left,
    price: room.price,
    available_from: toDateString(room.available_from),
    dist_km: dist_km === null ? null : round1(dist_km),
    walk_min: dist_km === null ? null : walkMinutes(dist_km),
  };

  if (detail) {
    out.directions_url = hostel ? directionsUrl(hostel) : null;
    out.landlord_contact = null;
  }

  return out;
}

function applyDistanceFilter(rooms, maxWalkMin) {
  const max = Number(maxWalkMin);
  if (Number.isNaN(max)) return rooms;
  return rooms.filter((room) => {
    const dist_km = room.hostel_id ? distanceFromCampus(room.hostel_id) : null;
    if (dist_km === null) return true;
    return walkMinutes(dist_km) <= max;
  });
}

function sortByDistance(rooms) {
  return [...rooms].sort((a, b) => {
    const da = a.hostel_id ? distanceFromCampus(a.hostel_id) : null;
    const db = b.hostel_id ? distanceFromCampus(b.hostel_id) : null;
    if (da === null && db === null) return a.id.toString().localeCompare(b.id.toString());
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}

async function listPublicRooms(query = {}) {
  const filter = { status: 'stock', beds_left: { $gte: 1 } };

  if (query.area) {
    if (!mongoose.Types.ObjectId.isValid(query.area)) return [];
    const hostels = await Hostel.find({ area_id: query.area }).select('_id');
    if (hostels.length === 0) return [];
    filter.hostel_id = { $in: hostels.map((h) => h._id) };
  }

  if (query.max_price !== undefined) {
    const maxPrice = Number(query.max_price);
    if (!Number.isNaN(maxPrice)) filter.price = { $lte: maxPrice };
  }

  if (query.type) {
    if (query.type === 'single' || query.type === 'shared') filter.type = query.type;
  }

  if (query.available_from) {
    const date = new Date(query.available_from);
    if (!Number.isNaN(date.getTime())) filter.available_from = { $lte: date };
  }

  let rooms = await Room.find(filter).populate(populate);

  if (query.max_walk_min !== undefined) {
    rooms = applyDistanceFilter(rooms, query.max_walk_min);
  }

  return sortByDistance(rooms).map((room) => serializeRoom(room));
}

async function getPublicRoom(roomId) {
  const room = await Room.findById(roomId).populate(populate);
  if (!room || room.status !== 'stock' || room.beds_left < 1) return null;
  return serializeRoom(room, { detail: true });
}

module.exports = { listPublicRooms, getPublicRoom, serializeRoom };
