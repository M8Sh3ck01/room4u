export function showArea(hostel, area) {
  return Boolean(area && hostel && !hostel.toLowerCase().includes(area.toLowerCase()));
}
