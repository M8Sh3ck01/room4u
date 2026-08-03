import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRoom } from '../../services/rooms';
import { formatMoney } from '../../lib/formatMoney';
import { Card, Badge, Button, Alert, Skeleton, EmptyState } from '../../design/primitives';
import './browse.css';

const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-MW', { month: 'short', day: 'numeric', year: 'numeric' });
};

export function RoomDetailScreen() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRoom(id)
      .then((data) => {
        if (!cancelled) setRoom(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="room-detail center">
        <Skeleton className="detail-photo" />
        <Skeleton className="detail-photo" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="room-detail center">
        <Card>
          <EmptyState
            title="Room not available"
            body={error}
            action={
              <Link to="/">
                <Button variant="ghost">Back to rooms</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const distance =
    room.dist_km != null
      ? `${room.dist_km} km straight-line Â· about ${room.walk_min} min walk from Mzuni`
      : 'Distance to be confirmed';

  return (
    <div className="room-detail center">
      <div className="detail-gallery">
        {room.photos.map((src, i) => (
          <img key={i} className="detail-photo" src={src} alt={`${room.hostel} photo ${i + 1}`} />
        ))}
      </div>

      <Card className="stack">
        <div className="detail-head">
          <div>
            <p className="text-muted">{room.area}</p>
            <h1 className="detail-title">{room.hostel}</h1>
          </div>
          <Badge variant={room.type === 'shared' ? 'info' : 'primary'}>{room.type}</Badge>
        </div>

        <p className="detail-price">
          {formatMoney(room.price)} <span className="text-muted">/bed/mo</span>
        </p>

        <div className="detail-rows">
          <p className="text-muted">{distance}</p>
          <p>
            <Badge variant={room.beds_left <= 1 ? 'danger' : 'success'}>
              {room.beds_left} bed{room.beds_left === 1 ? '' : 's'} left of {room.beds}
            </Badge>{' '}
            <Badge variant="warning">Available {fmtDate(room.available_from)}</Badge>
          </p>
        </div>

        {room.directions_url && (
          <Button as="a" href={room.directions_url} target="_blank" rel="noreferrer" fullWidth>
            Open walking directions
          </Button>
        )}

        <Alert variant="info" className="detail-locked">
          Landlord contact details unlock after you book this room.
        </Alert>

        <Link to="/">
          <Button variant="ghost">Back to rooms</Button>
        </Link>
      </Card>
    </div>
  );
}
