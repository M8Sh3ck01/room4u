import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Illustration } from '@/components/Illustration';
import { MapPin, Footprints } from 'lucide-react';
import { formatMoney } from '../../lib/formatMoney';

const hasRealPhotos = (room) =>
  Array.isArray(room.photos) && room.photos.some((p) => typeof p === 'string' && p && !p.includes('placehold.co'));

const firstRealPhoto = (room) => room.photos.find((p) => !p.includes('placehold.co'));

export function RoomCard({ room }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Link to={`/rooms/${room.id}`} className="group block no-underline text-inherit">
        {hasRealPhotos(room) ? (
          <img
            className="block aspect-video w-full bg-muted object-cover"
            src={firstRealPhoto(room)}
            alt={room.hostel}
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted text-muted-foreground">
            <Illustration />
          </div>
        )}
        <div className="flex flex-col gap-2 p-4">
          <p className="m-0 font-mono text-xs text-muted-foreground uppercase tracking-wider">
            {room.area}
          </p>
          <h3 className="mb-0 text-lg font-semibold text-foreground leading-tight tracking-tight">
            {room.hostel}
          </h3>

          <p className="m-0 flex items-center gap-2 text-sm">
            {room.walk_min != null ? (
              <>
                <Footprints className="shrink-0 size-4 text-muted-foreground" />
                <span className="font-medium">{`~${room.walk_min} min walk`}</span>
                {room.dist_km != null && (
                  <span className="text-muted-foreground">{`· ${room.dist_km} km`}</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Distance to come</span>
            )}
          </p>

          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground">{formatMoney(room.price)}</span>
            <span className="text-muted-foreground">per month</span>
            {room.type === 'shared' ? (
              room.beds_left <= 1 ? (
                <Badge variant="destructive" className="ml-auto">
                  {room.beds_left > 0 ? 'Last bed' : 'Full'}
                </Badge>
              ) : (
                <span className="ml-auto text-muted-foreground">
                  {room.beds_left} of {room.beds} beds left
                </span>
              )
            ) : (
              <span className="ml-auto text-muted-foreground">Single room</span>
            )}
          </div>
        </div>
      </Link>
      {room.directions_url && (
        <div className="p-4 pt-0">
          <Button asChild variant="outline" className="w-full">
            <a
              href={room.directions_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Walking directions to this room"
            >
              <MapPin className="size-4" />
              <span>Directions</span>
            </a>
          </Button>
        </div>
      )}
    </article>
  );
}