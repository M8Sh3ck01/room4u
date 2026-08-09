import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBookedRoom } from '../../services/bookings';
import { formatMoney } from '../../lib/formatMoney';
import { formatDate } from '../../lib/formatDate';
import { showArea } from '../../lib/area';
import { Button, Card, Badge, Skeleton, EmptyState, Illustration } from '../../design/primitives';
import {
  Footprints,
  Route,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { RoomMap } from '../browse/RoomMap';
import '../browse/browse.css';
import './booking.css';

const BOOKING_FEE = 20000;

const STATUS_META = {
  requested: { variant: 'warning', label: 'Awaiting payment' },
  paid: { variant: 'success', label: 'Paid' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
  refunded: { variant: 'info', label: 'Refunded' },
};

const realPhotos = (room) =>
  Array.isArray(room.photos)
    ? room.photos.filter((p) => typeof p === 'string' && p && !p.includes('placehold.co'))
    : [];

const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-MW', { month: 'short', day: 'numeric', year: 'numeric' });
};

export function BookedRoomScreen() {
  const { bookingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(0);
  const touchX = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBookedRoom(bookingId)
      .then((d) => {
        if (!cancelled) setData(d);
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
  }, [bookingId]);

  if (loading) {
    return (
      <div className="room-detail center measure-lg">
        <Skeleton className="detail-stage" />
      </div>
    );
  }

  if (error || !data || !data.room) {
    return (
      <div className="room-detail center measure-lg">
        <Card>
          <EmptyState
            title="Booking not found"
            body={error || 'This booking could not be loaded.'}
            action={
              <Link to="/bookings">
                <Button variant="ghost">Back to my bookings</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const { booking, room } = data;
  const meta = STATUS_META[booking.status] || { variant: 'info', label: booking.status };
  const photos = realPhotos(room);
  const prev = () => setActive((a) => (a - 1 + photos.length) % photos.length);
  const next = () => setActive((a) => (a + 1) % photos.length);
  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) prev();
    else next();
  };

  return (
    <div className="room-detail center">
      <Link to="/bookings" className="booked-back">
        <ArrowLeft className="booked-back-icon" />
        My bookings
      </Link>

      {photos.length > 0 ? (
        <>
          <div className="detail-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <img
              className="detail-stage-img"
              src={photos[active]}
              alt={`${room.hostel} — photo ${active + 1}`}
              loading={active === 0 ? 'eager' : 'lazy'}
            />
            {photos.length > 1 && (
              <>
                <span className="detail-counter" aria-live="polite">
                  {active + 1} / {photos.length}
                </span>
                <button
                  type="button"
                  className="detail-stage-btn detail-stage-btn--prev"
                  onClick={prev}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="detail-stage-btn-icon" />
                </button>
                <button
                  type="button"
                  className="detail-stage-btn detail-stage-btn--next"
                  onClick={next}
                  aria-label="Next photo"
                >
                  <ChevronRight className="detail-stage-btn-icon" />
                </button>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div className="detail-thumbs">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className={`detail-thumb${i === active ? ' detail-thumb--active' : ''}`}
                  onClick={() => setActive(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === active ? 'true' : undefined}
                >
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="detail-photo detail-photo--illustration">
          <Illustration />
        </div>
      )}

      <p className="detail-kicker text-muted">
        {room.type === 'shared' ? 'Shared room' : 'Single room'}
        {showArea(room.hostel, room.area) ? ` · ${room.area}` : ''}
      </p>
      <h1 className="detail-title">{room.hostel}</h1>
      <p className="detail-price">
        {formatMoney(room.price)} <span className="text-muted">per month</span>
      </p>

      <Card className="booked-panel">
        <div className="booked-panel-head">
          <span className="booked-panel-label">Your booking</span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <div className="booking-rows">
          <div className="booking-row">
            <span className="booking-row-label">Booking fee</span>
            <span className="booking-row-value">{formatMoney(BOOKING_FEE)}</span>
          </div>
          {booking.status === 'paid' && booking.move_in_date && (
            <div className="booking-row">
              <span className="booking-row-label">Move-in</span>
              <span className="booking-row-value">{formatDate(booking.move_in_date)}</span>
            </div>
          )}
          <div className="booking-row">
            <span className="booking-row-label">Rent</span>
            <span className="booking-row-value">{formatMoney(room.price)} / month</span>
          </div>
        </div>
      </Card>

      <div className="detail-facts">
        <div className="detail-fact">
          <span className="detail-fact-label">Walk</span>
          <span className="detail-fact-value">
            <Footprints className="detail-fact-icon" />
            {room.walk_min != null ? `~${room.walk_min} min walk` : 'To be confirmed'}
          </span>
        </div>
        {room.dist_km != null && (
          <div className="detail-fact">
            <span className="detail-fact-label">Distance</span>
            <span className="detail-fact-value">
              <Route className="detail-fact-icon" />
              {room.dist_km} km
            </span>
            <span className="detail-fact-note">straight-line</span>
          </div>
        )}
        {room.type === 'shared' && (
          <div className="detail-fact">
            <span className="detail-fact-label">Beds</span>
            <span className="detail-fact-value">
              <BedDouble className="detail-fact-icon" />
              {room.beds} beds
            </span>
          </div>
        )}
        <div className={`detail-fact${room.type === 'shared' ? '' : ' detail-fact--wide'}`}>
          <span className="detail-fact-label">Available</span>
          <span className="detail-fact-value">
            <CalendarDays className="detail-fact-icon" />
            {fmtDate(room.available_from)}
          </span>
        </div>
      </div>

      <RoomMap key={room.id} lat={room.lat} lng={room.lng} />

      {room.directions_url && (
        <Button as="a" href={room.directions_url} target="_blank" rel="noreferrer" variant="ghost" fullWidth>
          Open in Google Maps
        </Button>
      )}

      
    </div>
  );
}
