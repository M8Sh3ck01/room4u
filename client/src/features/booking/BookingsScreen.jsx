import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings, cancelBooking } from '../../services/bookings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { formatMoney } from '../../lib/formatMoney';
import { formatDate } from '../../lib/formatDate';
import { showArea } from '../../lib/area';

const BOOKING_FEE = 20000;

const STATUS_META = {
  requested: { badge: 'bg-amber-50 text-amber-800', label: 'Awaiting payment' },
  paid: { badge: 'bg-emerald-50 text-emerald-800', label: 'Paid' },
  cancelled: { badge: 'bg-red-50 text-red-800', label: 'Cancelled' },
  refunded: { badge: 'bg-sky-50 text-sky-800', label: 'Refunded' },
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
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <h1 className="m-0 text-2xl font-semibold tracking-tight">My bookings</h1>
        <div className="flex flex-col gap-3" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-4 w-[45%]" />
              <Skeleton className="h-4" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <h1 className="m-0 text-2xl font-semibold tracking-tight">My bookings</h1>

      {error && (
        <Alert variant="destructive" role="alert">
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
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => {
            const meta = STATUS_META[booking.status] || { badge: '', label: booking.status };
            const room = booking.room;
            return (
              <Card key={booking.id} className="gap-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="m-0 text-lg font-semibold">{room ? room.hostel : 'Room'}</h2>
                  <Badge className={meta.badge}>{meta.label}</Badge>
                </div>
                {room && (
                  <p className="m-0 text-sm text-muted-foreground">
                    {showArea(room.hostel, room.area) ? room.area : ''}
                    {room.available_from ? ` · available ${formatDate(room.available_from)}` : ''}
                  </p>
                )}
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">Booking fee</span>
                    <span className="font-semibold">{formatMoney(BOOKING_FEE)}</span>
                  </div>
                  {booking.status === 'paid' && booking.move_in_date && (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground">Move-in</span>
                      <span className="font-semibold">{formatDate(booking.move_in_date)}</span>
                    </div>
                  )}
                  {booking.status === 'cancelled' && booking.cancelled_at && (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground">Cancelled</span>
                      <span className="font-semibold">{formatDate(booking.cancelled_at)}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {booking.status === 'requested' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => cancel(booking.id)}
                      disabled={cancellingId === booking.id}
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