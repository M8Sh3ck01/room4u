import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings, cancelBooking } from '../../services/bookings';
import { Button, Card, Alert, Badge, EmptyState, Skeleton } from '../../design/primitives';
import { formatMoney } from '../../lib/formatMoney';
import { formatDate } from '../../lib/formatDate';
import { showArea } from '../../lib/area';
import './booking.css';

const BOOKING_FEE = 20000;

const STATUS_META = {
  requested: { variant: 'warning', label: 'Awaiting payment' },
  paid: { variant: 'success', label: 'Paid' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
  refunded: { variant: 'info', label: 'Refunded' },
};

export function BookingsScreen() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setBookings(await getMyBookings());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const cancel = useCallback(
    async (bookingId) => {
      setCancellingId(bookingId);
      setError(null);
      try {
        await cancelBooking(bookingId);
        await refresh();
      } catch (err) {
        setError(err.message);
      } finally {
        setCancellingId(null);
      }
    },
    [refresh]
  );

  if (!bookings) {
    return (
      <div className="bookings center measure">
        <h1 className="bookings-title">My bookings</h1>
        <div className="bookings-list" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="booking-card booking-card--skeleton">
              <Skeleton className="booking-skeleton-title" />
              <Skeleton className="booking-skeleton-line booking-skeleton-line--short" />
              <Skeleton className="booking-skeleton-line" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bookings center measure">
      <h1 className="bookings-title">My bookings</h1>

      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      {bookings.length === 0 ? (
        <Card>
          <EmptyState
            title="No bookings yet"
            body="When you reserve a room, it shows up here so you can keep track of your payment and move-in date."
            action={
              <Link to="/">
                <Button>Browse rooms</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => {
            const meta = STATUS_META[booking.status] || { variant: 'info', label: booking.status };
            const room = booking.room;
            return (
              <Card key={booking.id} className="booking-card">
                <div className="booking-card-head">
                  <h2 className="booking-room">{room ? room.hostel : 'Room'}</h2>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                {room && (
                  <p className="booking-meta text-muted">
                    {showArea(room.hostel, room.area) ? room.area : ''}
                    {room.available_from ? ` · available ${formatDate(room.available_from)}` : ''}
                  </p>
                )}
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
                  {booking.status === 'cancelled' && booking.cancelled_at && (
                    <div className="booking-row">
                      <span className="booking-row-label">Cancelled</span>
                      <span className="booking-row-value">{formatDate(booking.cancelled_at)}</span>
                    </div>
                  )}
                </div>
                <div className="booking-actions">
                  {booking.status === 'requested' && (
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      onClick={() => cancel(booking.id)}
                      loading={cancellingId === booking.id}
                    >
                      {cancellingId === booking.id ? 'Cancelling…' : 'Cancel booking'}
                    </Button>
                  )}
                  {(booking.status === 'paid' || booking.status === 'requested') && room && (
                    <Link to={`/bookings/${booking.id}/room`}>
                      <Button variant="ghost" size="sm">
                        View room
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
