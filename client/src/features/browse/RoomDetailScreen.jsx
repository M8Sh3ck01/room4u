import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRoom } from '../../services/rooms';
import { formatMoney } from '../../lib/formatMoney';
import { Card, Button, Skeleton, EmptyState, Illustration } from '../../design/primitives';
import { MapPin, BedDouble, CalendarDays } from 'lucide-react';
import './browse.css';

const hasRealPhotos = (room) =>
  Array.isArray(room.photos) && room.photos.some((p) => typeof p === 'string' && p && !p.includes('placehold.co'));

const bedsCopy = (room) => {
  if (room.beds_left <= 0) return 'Full';
  if (room.beds_left >= room.beds) return `All ${room.beds} beds open`;
  return `${room.beds_left} of ${room.beds} beds left`;
};

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
      <div className="room-detail center measure-lg">
        <Skeleton className="detail-photo" />
        <Skeleton className="detail-photo" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="room-detail center measure-lg">
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

  return (
    <div className="room-detail center">
      {hasRealPhotos(room) ? (
        <div className="detail-gallery">
          {room.photos
            .filter((p) => typeof p === 'string' && p && !p.includes('placehold.co'))
            .map((src) => (
              <img key={src} className="detail-photo" src={src} alt={room.hostel} />
            ))}
        </div>
      ) : (
        <div className="detail-photo detail-photo--illustration">
          <Illustration />
        </div>
      )}

      <p className="detail-kicker text-muted">
        {room.type === 'shared' ? 'Shared room' : 'Single room'} · {room.area}
      </p>
      <h1 className="detail-title">{room.hostel}</h1>

      <p className="detail-price">
        {formatMoney(room.price)}{' '}
        <span className="text-muted">{room.type === 'shared' ? '/bed/mo' : '/mo'}</span>
      </p>

      <div className="detail-facts">
        <div className="detail-fact">
          <span className="detail-fact-label">Walk</span>
          <span className="detail-fact-value">
            <MapPin className="detail-fact-icon" />
            {room.walk_min != null ? `~${room.walk_min} min walk` : 'To be confirmed'}
          </span>
          {room.dist_km != null && (
            <span className="detail-fact-note">· {room.dist_km} km straight-line</span>
          )}
        </div>
        {room.type === 'shared' && (
          <div className="detail-fact">
            <span className="detail-fact-label">Beds</span>
            <span className="detail-fact-value">
              <BedDouble className="detail-fact-icon" />
              {bedsCopy(room)}
            </span>
          </div>
        )}
        <div className={`detail-fact${room.type === 'shared' ? ' detail-fact--wide' : ''}`}>
          <span className="detail-fact-label">Available</span>
          <span className="detail-fact-value">
            <CalendarDays className="detail-fact-icon" />
            {fmtDate(room.available_from)}
          </span>
        </div>
      </div>

      {room.directions_url && (
        <Button as="a" href={room.directions_url} target="_blank" rel="noreferrer" fullWidth>
          Open walking directions
        </Button>
      )}
    </div>
  );
}
