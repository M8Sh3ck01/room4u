import { Link } from 'react-router-dom';
import { Card, Badge } from '../../design/primitives';
import { formatMoney } from '../../lib/formatMoney';

export function RoomCard({ room }) {
  return (
    <Card className="room-card">
      <Link to={`/rooms/${room.id}`} className="room-card-link">
        {room.photos?.[0] ? (
          <img className="room-card-photo" src={room.photos[0]} alt={room.hostel} />
        ) : (
          <div className="room-card-photo" />
        )}
        <div className="room-card-body">
          <h3 className="room-card-title">{room.hostel}</h3>
          <p className="room-card-area text-muted">{room.area}</p>

          <div className="room-card-distance">
            {room.walk_min != null ? (
              <>
                <span className="room-card-walk">~{room.walk_min} min walk from Mzuni</span>
                {room.dist_km != null && <span className="text-muted">· {room.dist_km} km</span>}
              </>
            ) : (
              <span className="text-muted">Distance to come</span>
            )}
          </div>

          <div className="room-card-meta">
            <span className="room-price">{formatMoney(room.price)}</span>
            <span className="text-muted">/bed/mo</span>
            <Badge variant={room.beds_left <= 1 ? 'danger' : 'success'}>
              {room.beds_left} bed{room.beds_left === 1 ? '' : 's'} left
            </Badge>
          </div>
        </div>
      </Link>
      {room.directions_url && (
        <a
          className="room-card-dir"
          href={room.directions_url}
          target="_blank"
          rel="noreferrer"
        >
          Walking directions
        </a>
      )}
    </Card>
  );
}
