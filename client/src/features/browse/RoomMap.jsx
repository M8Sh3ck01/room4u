import { MapPin } from 'lucide-react';

export function RoomMap({ lat, lng }) {
  if (lat == null || lng == null) return null;

  const src = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

  return (
    <div className="room-map">
      <p className="room-map-label">
        <MapPin className="room-map-toggle-icon" aria-hidden="true" />
        Show location on map
      </p>
      <iframe
        className="room-map-frame"
        title="Map showing the location of this room"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
