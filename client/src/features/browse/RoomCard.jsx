import { Link } from 'react-router-dom';
import { Card, Badge } from '../../design/primitives';
import { formatMoney } from '../../lib/formatMoney';

export function RoomCard({ room }) {
  return (
    <Link to={`/rooms/${room.id}`} className="room-card-link">
      <Card className="room-card">
        {room.photos?.[0] ? (
          <img className="room-card-photo" src={room.photos[0]} alt={room.hostel} />
        ) : (
          <div className="room-card-photo" />
        )}
        <div className="room-card-body">
          <div className="room-card-head">
            <h3 className="room-card-title">{room.hostel}</h3>
            <Badge variant={room.type === 'shared' ? 'info' : 'primary'}>{room.type}</Badge>
          </div>
          <p className="text-muted">
            {room.area}
            {room.dist_km != null
              ? ` · ${room.dist_km} km · ~${room.walk_min} min walk from Mzuni`
              : ' · distance to come'}
          </p>
          <div className="room-card-meta">
            <span className="room-price">{formatMoney(room.price)}</span>
            <span className="text-muted">/bed/mo</span>
            <Badge variant={room.beds_left <= 1 ? 'danger' : 'success'}>
              {room.beds_left} bed{room.beds_left === 1 ? '' : 's'} left
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
