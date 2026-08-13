import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRoom } from '../../services/rooms';
import { formatMoney } from '../../lib/formatMoney';
import { showArea } from '../../lib/area';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Illustration } from '@/components/Illustration';
import { cn } from '@/lib/utils';
import { Footprints, Route, BedDouble, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { RoomMap } from './RoomMap';
import { ClaimBar } from '../booking/ClaimBar';

const realPhotos = (room) =>
  Array.isArray(room.photos) ? room.photos.filter((p) => typeof p === 'string' && p && !p.includes('placehold.co')) : [];

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
  const [active, setActive] = useState(0);
  const touchX = useRef(null);

  useEffect(() => {
    setActive(0);
  }, [id]);

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

  const photos = room ? realPhotos(room) : [];
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

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-measure-lg flex-col gap-6">
        <Skeleton className="aspect-video w-full rounded-md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-measure-lg flex-col gap-6">
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
    <div className="mx-auto flex w-full flex-col gap-6">
      {photos.length > 0 ? (
        <>
          <div
            className="relative aspect-video w-full touch-pan-y overflow-hidden rounded-md bg-muted"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <img
              className="block h-full w-full select-none object-cover"
              src={photos[active]}
              alt={`${room.hostel} — photo ${active + 1}`}
              loading={active === 0 ? 'eager' : 'lazy'}
            />
            {photos.length > 1 && (
              <>
                <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-[var(--color-overlay)] px-2 text-xs text-white" aria-live="polite">
                  {active + 1} / {photos.length}
                </span>
                <button
                  type="button"
                  className="absolute top-1/2 left-2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--color-overlay)] text-white hover:bg-primary hover:text-primary-foreground"
                  onClick={prev}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="size-7" />
                </button>
                <button
                  type="button"
                  className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--color-overlay)] text-white hover:bg-primary hover:text-primary-foreground"
                  onClick={next}
                  aria-label="Next photo"
                >
                  <ChevronRight className="size-7" />
                </button>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className={cn(
                    'flex min-h-[var(--control-min-h)] w-16 shrink-0 cursor-pointer overflow-hidden rounded-sm border-2 border-transparent bg-muted p-1',
                    i === active && 'border-primary'
                  )}
                  onClick={() => setActive(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === active ? 'true' : undefined}
                >
                  <img src={src} alt="" className="block aspect-video w-full select-none object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted text-[var(--color-text-faint)]">
          <Illustration />
        </div>
      )}

      <p className="m-0 font-mono text-xs text-[var(--color-text-faint)] uppercase tracking-wider">
        {room.type === 'shared' ? 'Shared room' : 'Single room'}
        {showArea(room.hostel, room.area) ? ` · ${room.area}` : ''}
      </p>
      <h1 className="m-0 text-[clamp(var(--text-xl),3.5vw,var(--text-2xl))] leading-[var(--leading-display)]">
        {room.hostel}
      </h1>

      <p className="m-0 border-t border-border pt-3 text-lg font-bold text-foreground whitespace-nowrap">
        {formatMoney(room.price)}
        <span className="text-muted-foreground">&nbsp;per month</span>
      </p>

      <ClaimBar room={room} />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
        <div className="flex flex-col gap-1 bg-muted p-4">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Walk</span>
          <span className="flex items-center gap-2 text-base font-medium text-foreground">
            <Footprints className="size-6 shrink-0 text-muted-foreground" />
            {room.walk_min != null ? `~${room.walk_min} min walk` : 'To be confirmed'}
          </span>
        </div>
        {room.dist_km != null && (
          <div className="flex flex-col gap-1 bg-muted p-4">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Distance</span>
            <span className="flex items-center gap-2 text-base font-medium text-foreground">
              <Route className="size-6 shrink-0 text-muted-foreground" />
              {room.dist_km} km
            </span>
            <span className="text-sm text-muted-foreground">straight-line</span>
          </div>
        )}
        {room.type === 'shared' && (
          <div className="flex flex-col gap-1 bg-muted p-4">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Beds</span>
            <span className="flex items-center gap-2 text-base font-medium text-foreground">
              <BedDouble className="size-6 shrink-0 text-muted-foreground" />
              {bedsCopy(room)}
            </span>
          </div>
        )}
        <div className={cn('flex flex-col gap-1 bg-muted p-4', room.type === 'shared' ? '' : 'col-span-2')}>
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Available</span>
          <span className="flex items-center gap-2 text-base font-medium text-foreground">
            <CalendarDays className="size-6 shrink-0 text-muted-foreground" />
            {fmtDate(room.available_from)}
          </span>
        </div>
      </div>

      <RoomMap key={room.id} lat={room.lat} lng={room.lng} />

      {room.directions_url && (
        <Button
          asChild
          variant="ghost"
          className="w-full border border-border"
        >
          <a href={room.directions_url} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>
        </Button>
      )}
    </div>
  );
}