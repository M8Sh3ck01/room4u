import { MapPin } from 'lucide-react';

export function RoomMap({ lat, lng }) {
  if (lat == null || lng == null) return null;

  const src = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

  return (
    <div className="w-full overflow-hidden rounded-md border border-border bg-card">
      <p className="m-0 inline-flex w-full items-center justify-center gap-2 border-b border-border px-4 py-3 font-mono text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
        Show location on map
      </p>
      <iframe
        className="block aspect-video w-full border-0"
        title="Map showing the location of this room"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}