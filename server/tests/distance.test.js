const { haversineKm, walkMinutes, distanceFromCampus, directionsUrl } = require('@shared/services/distance');

describe('shared/services/distance', () => {
  it('haversineKm returns 0 for identical points', () => {
    expect(haversineKm(-11.4584, 34.0257, -11.4584, 34.0257)).toBe(0);
  });

  it('haversineKm is ~111.32 km per degree of latitude', () => {
    const km = haversineKm(0, 0, 1, 0);
    expect(km).toBeGreaterThan(110.9);
    expect(km).toBeLessThan(111.5);
  });

  it('walkMinutes(2.1) = 32 (12 min/km x 1.25 detour)', () => {
    expect(walkMinutes(2.1)).toBe(32);
  });

  it('distanceFromCampus returns null when the hostel has no pin', () => {
    expect(distanceFromCampus({ lat: null, lng: null })).toBeNull();
    expect(distanceFromCampus(null)).toBeNull();
  });

  it('directionsUrl deep-links walking directions from campus to the hostel', () => {
    const url = directionsUrl({ lat: -11.439266, lng: 34.0257 });
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=-11.4584,34.0257&destination=-11.439266,34.0257&travelmode=walking'
    );
  });

  it('directionsUrl returns null without a pin', () => {
    expect(directionsUrl({ lat: null, lng: null })).toBeNull();
  });
});
