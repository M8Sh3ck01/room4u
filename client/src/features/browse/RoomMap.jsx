import { useSearchParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export function RoomMap({ lat, lng }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const show = searchParams.get('map') === '1';

  const toggle = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (show) next.delete('map');
        else next.set('map', '1');
        return next;
      },
      { replace: true }
    );
  };

  if (lat == null || lng == null) return null;

  const src = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

  if (!show) {
    return (
      <div className="room-map">
        <button type="button" className="room-map-toggle" onClick={toggle} aria-expanded={show}>
          <MapPin className="room-map-toggle-icon" aria-hidden="true" />
          Show location on map
        </button>
      </div>
    );
  }

  return (
    <div className="room-map">
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
