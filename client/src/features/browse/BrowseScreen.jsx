import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listRooms } from '../../services/rooms';
import { Card, Button, Alert, Skeleton, EmptyState, Badge } from '../../design/primitives';
import { Footprints, BadgeCheck, Banknote, X, ArrowDown } from 'lucide-react';
import { formatMoney } from '../../lib/formatMoney';
import { RoomCard } from './RoomCard';
import { FilterSelect } from './FilterSelect';
import './browse.css';

const PARAM_BY_KEY = { type: 'type', max_walk_min: 'walk', max_price: 'price' };

export function BrowseScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toolbarRef = useRef(null);

  const filters = {
    type: searchParams.get('type') ?? '',
    max_walk_min: searchParams.get('walk') ?? '',
    max_price: searchParams.get('price') ?? '',
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listRooms(filters)
      .then((data) => {
        if (!cancelled) setRooms(data);
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
    <div className="browse">
      <section className="hero-banner">
        <div className="hero-banner-inner">
          <div className="hero-message">
            <div className="hero-copy">
              <p className="hero-kicker">Vetted student rooms · Mzuzu University</p>
              <h1>Discover your room around Mzuzu University</h1>
              <div className="hero-chips" aria-label="What you get on every room">
                <Badge variant="primary">
                  <BadgeCheck className="chip-icon" /> Verified
                </Badge>
                <Badge variant="primary">
                  <Footprints className="chip-icon" /> Walkable
                </Badge>
                <Badge variant="primary">
                  <Banknote className="chip-icon" /> Affordable
                </Badge>
              </div>

              <button type="button" className="hero-cta" onClick={scrollToResults}>
                Find a room
                <ArrowDown className="hero-cta-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="results-toolbar" role="group" aria-label="Filter rooms" ref={toolbarRef}>
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
          <button type="button" className="filters-clear" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="filter-chip"
              onClick={() => clear(chip.key)}
              aria-label={`Remove ${chip.label} filter`}
            >
              {chip.label}
              <X className="filter-chip-icon" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="results-area" aria-busy={loading}>
        <div
          key={loading ? 'loading' : rooms.length === 0 ? 'empty' : 'rooms'}
          className="results-swap"
        >
        {loading ? (
          <div className="room-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-card">
                <Skeleton className="skeleton-photo" />
                <div className="skeleton-body">
                  <Skeleton className="skeleton-line" />
                  <Skeleton className="skeleton-line skeleton-line--short" />
                  <Skeleton className="skeleton-line skeleton-line--price" />
                </div>
                <Skeleton className="skeleton-footer" />
              </div>
            ))}
          </div>
        ) : error ? null : rooms.length === 0 ? (
          <Card>
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
          </Card>
        ) : (
          <div className="room-grid">
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
