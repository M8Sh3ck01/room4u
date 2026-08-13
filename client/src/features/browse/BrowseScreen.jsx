import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listRooms } from '../../services/rooms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { Footprints, BadgeCheck, Banknote, X, ArrowDown, ServerOff, RefreshCw, Loader2 } from 'lucide-react';
import { formatMoney } from '../../lib/formatMoney';
import { RoomCard } from './RoomCard';
import { FilterSelect } from './FilterSelect';

const PARAM_BY_KEY = { type: 'type', max_walk_min: 'walk', max_price: 'price' };

const MAX_AUTO_RETRIES = 3;

export function BrowseScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [autoRetries, setAutoRetries] = useState(0);
  const toolbarRef = useRef(null);
  const retryStart = useRef(0);

  const MIN_FEEDBACK_MS = 900;

  const filters = {
    type: searchParams.get('type') ?? '',
    max_walk_min: searchParams.get('walk') ?? '',
    max_price: searchParams.get('price') ?? '',
  };

  const handleRetry = () => {
    retryStart.current = Date.now();
    setRetrying(true);
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (!retrying || loading) return undefined;
    const remain = Math.max(0, MIN_FEEDBACK_MS - (Date.now() - retryStart.current));
    const timer = setTimeout(() => setRetrying(false), remain);
    return () => clearTimeout(timer);
  }, [retrying, loading]);

  useEffect(() => {
    let cancelled = false;
    if (!failed) setLoading(true);
    listRooms(filters)
      .then((data) => {
        if (!cancelled) {
          setRooms(data);
          setFailed(false);
          setAutoRetries(0);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.type, filters.max_walk_min, filters.max_price, attempt]);

  const RETRY_MS = 4000;

  useEffect(() => {
    if (!failed || autoRetries >= MAX_AUTO_RETRIES) return undefined;
    const timer = setTimeout(() => {
      setAutoRetries((n) => n + 1);
      setAttempt((n) => n + 1);
    }, RETRY_MS);
    return () => clearTimeout(timer);
  }, [failed, autoRetries, attempt]);

  useEffect(() => {
    setAutoRetries(0);
  }, [filters.type, filters.max_walk_min, filters.max_price]);

  const change = (key) => (value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(PARAM_BY_KEY[key], value);
        else next.delete(PARAM_BY_KEY[key]);
        return next;
      },
      { replace: true }
    );
  };

  const clear = (key) => change(key)('');

  const clearAll = () => {
    setSearchParams({}, { replace: true });
  };

  const scrollToResults = () => {
    toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeFilters = [];
  if (filters.type) {
    activeFilters.push({ key: 'type', label: filters.type === 'shared' ? 'Shared' : 'Single' });
  }
  if (filters.max_walk_min) {
    activeFilters.push({ key: 'max_walk_min', label: `~${filters.max_walk_min} min walk` });
  }
  if (filters.max_price) {
    activeFilters.push({ key: 'max_price', label: `≤ ${formatMoney(filters.max_price)} per month` });
  }

  const hasFilters = activeFilters.length > 0;

  const emptyTitle = hasFilters ? 'No rooms match your filters' : 'No rooms yet';

  const emptyBody = hasFilters
    ? `Nothing matches ${activeFilters.map((f) => f.label).join(', ')}. Try widening a filter or clear all.`
    : "We're setting up the first rooms near Mzuzu University. Check back soon.";

  return (
    <div className="flex flex-col gap-6">
      <section className="relative -mt-6 w-screen -ml-[calc(50vw-50%)] overflow-hidden border-b border-border bg-[radial-gradient(circle_at_75%_10%,var(--muted)_0%,transparent_50%),linear-gradient(115deg,var(--muted)_0%,var(--background)_60%,var(--muted)_100%)] text-foreground">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h1 className="mb-6 max-w-[18ch] font-sans text-4xl font-bold text-foreground tracking-tight normal-case leading-tight md:text-5xl">
            Discover your room around Mzuzu University
          </h1>
          <div className="flex flex-wrap gap-2" aria-label="What you get on every room">
            <Badge variant="secondary">
              <BadgeCheck className="size-4" /> Verified
            </Badge>
            <Badge variant="secondary">
              <Footprints className="size-4" /> Walkable
            </Badge>
            <Badge variant="secondary">
              <Banknote className="size-4" /> Affordable
            </Badge>
          </div>

          <Button size="lg" className="mt-8" onClick={scrollToResults}>
            Find a room
            <ArrowDown className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </section>

      <div
        className="sticky top-20 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur"
        role="group"
        aria-label="Filter rooms"
        ref={toolbarRef}
      >
        <FilterSelect
          label="Type"
          ariaLabel="Room type"
          value={filters.type}
          onChange={change('type')}
          options={[
            { value: '', label: 'Type' },
            { value: 'single', label: 'Single' },
            { value: 'shared', label: 'Shared' },
          ]}
        />

        <FilterSelect
          label="Walk"
          ariaLabel="Max walking time"
          value={filters.max_walk_min}
          onChange={change('max_walk_min')}
          options={[
            { value: '', label: 'Walk' },
            { value: '15', label: '≤ 15 min' },
            { value: '30', label: '≤ 30 min' },
            { value: '45', label: '≤ 45 min' },
            { value: '60', label: '≤ 60 min' },
          ]}
        />

        <FilterSelect
          label="Price"
          ariaLabel="Max price per month"
          value={filters.max_price}
          onChange={change('max_price')}
          options={[
            { value: '', label: 'Price' },
            { value: '10000', label: '≤ MK10,000' },
            { value: '15000', label: '≤ MK15,000' },
            { value: '20000', label: '≤ MK20,000' },
            { value: '25000', label: '≤ MK25,000' },
          ]}
        />

        {activeFilters.length > 0 && (
          <button
            type="button"
            className="inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap bg-none px-2 font-semibold text-base text-foreground hover:text-muted-foreground hover:underline"
            onClick={clearAll}
          >
            Clear all
          </button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="inline-flex max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-full bg-secondary px-3 font-medium text-base text-secondary-foreground hover:bg-muted"
              onClick={() => clear(chip.key)}
              aria-label={`Remove ${chip.label} filter`}
            >
              {chip.label}
              <X className="size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <div className="results-area" aria-busy={loading || failed}>
        <div
          key={loading && !failed ? 'loading' : error || failed ? 'error' : rooms.length ? 'rooms' : 'empty'}
          className="animate-in fade-in duration-200"
        >
          {loading && !failed ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col">
                  <Skeleton className="aspect-video w-full rounded-md" />
                  <div className="mt-3 flex flex-1 flex-col gap-3">
                    <Skeleton className="h-4 rounded-sm" />
                    <Skeleton className="h-4 w-3/5 rounded-sm" />
                    <Skeleton className="h-5 w-2/5 rounded-sm" />
                  </div>
                  <Skeleton className="mt-auto h-11" />
                </div>
              ))}
            </div>
          ) : error || failed ? (
            <div className="rounded-xl border border-border bg-card">
              <EmptyState
                title="Rooms won't load right now"
                body="The server's taking a while — hang tight."
                action={
                  <Button onClick={handleRetry} disabled={retrying}>
                    {retrying ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="size-4" aria-hidden="true" />
                    )}
                    {retrying ? 'Retrying…' : 'Try again'}
                  </Button>
                }
              >
                <ServerOff className="size-10 text-muted-foreground" aria-hidden="true" />
              </EmptyState>
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-xl border border-border bg-card">
              <EmptyState
                title={emptyTitle}
                body={emptyBody}
                action={
                  hasFilters ? (
                    <Button variant="ghost" onClick={clearAll}>
                      Reset
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}