import { Link } from 'react-router-dom';
import { Badge, Illustration } from '../../design/primitives';
import { MapPin, Footprints } from 'lucide-react';
import { formatMoney } from '../../lib/formatMoney';

const hasRealPhotos = (room) =>
  Array.isArray(room.photos) && room.photos.some((p) => typeof p === 'string' && p && !p.includes('placehold.co'));

const firstRealPhoto = (room) => room.photos.find((p) => !p.includes('placehold.co'));

export function RoomCard({ room }) {
  return (
    <article className="room-card">
      <Link to={`/rooms/${room.id}`} className="room-card-link">
        {hasRealPhotos(room) ? (
          <img className="room-card-photo" src={firstRealPhoto(room)} alt={room.hostel} />
        ) : (
          <div className="room-card-photo room-card-photo--illustration">
            <Illustration />
          </div>
        )}
        <div className="room-card-body">
          <p className="room-card-kicker text-muted">{room.area}</p>
          <h3 className="room-card-title">{room.hostel}</h3>

          <p className="room-card-distance">
            {room.walk_min != null ? (
              <>
                <Footprints className="room-card-dist-icon" />
                <span className="room-card-walk">~{room.walk_min} min walk</span>
                {room.dist_km != null && <span className="text-muted">· {room.dist_km} km</span>}
              </>
            ) : (
              <span className="text-muted">Distance to come</span>
            )}
          </p>

          <div className="room-card-meta">
            <span className="room-price">{formatMoney(room.price)}</span>
            <span className="text-muted">{room.type === 'shared' ? '/bed/month' : '/month'}</span>
            {room.type === 'shared' ? (
              <Badge variant={room.beds_left <= 1 ? 'danger' : 'success'}>
                {room.beds_left > 0 ? `${room.beds_left} of ${room.beds} beds left` : 'Full'}
              </Badge>
            ) : (
              <Badge variant="primary">Single room</Badge>
            )}
          </div>
        </div>
      </Link>
      {room.directions_url && (
        <a
          className="room-card-dir"
          href={room.directions_url}
          target="_blank"
          rel="noreferrer"
          aria-label="Walking directions to this room"
        >
          <MapPin className="room-card-dir-icon" />
        </a>
      )}
    </article>
  );
}
