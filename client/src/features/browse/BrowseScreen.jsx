import { useEffect, useState } from 'react';
import { listRooms, listAreas } from '../../services/rooms';
import { Card, Select, Button, Alert, Skeleton, EmptyState, Badge } from '../../design/primitives';
import { Footprints, BadgeCheck, Banknote, X } from 'lucide-react';
import { formatMoney } from '../../lib/formatMoney';
import { RoomCard } from './RoomCard';
import './browse.css';

const EMPTY = { area: '', type: '', max_walk_min: '', max_price: '' };

export function BrowseScreen() {
  const [areas, setAreas] = useState([]);
  const [areasError, setAreasError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listAreas()
      .then(setAreas)
      .catch(() =>
        setAreasError("Couldn't load areas. The Area filter is unavailable right now.")
      );
  }, []);

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
  }, [filters]);

  const change = (key) => (e) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const clear = (key) => {
    setFilters((prev) => ({ ...prev, [key]: '' }));
  };

  const clearAll = () => setFilters(EMPTY);

  const activeFilters = [];
  if (filters.area) {
    const a = areas.find((x) => x.id === filters.area);
    activeFilters.push({ key: 'area', label: a ? a.name : filters.area });
  }
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

  const loaded = !loading && !error;
  const catalogEmpty = loaded && rooms.length === 0 && !hasFilters;
  const showResultsBar = !catalogEmpty;

  return (
    <div className="browse">
      <section className="hero-banner">
        <div className="hero-banner-inner">
          
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
        </div>
      </section>

      {showResultsBar && (
        <div className="quick-filters" role="group" aria-label="Filter rooms">
          <Select className="quick-filter" id="f-area" value={filters.area} onChange={change('area')} aria-label="Area">
            <option value="">Area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>

          <Select className="quick-filter" id="f-type" value={filters.type} onChange={change('type')} aria-label="Room type">
            <option value="">Type</option>
            <option value="single">Single</option>
            <option value="shared">Shared</option>
          </Select>

          <Select className="quick-filter" id="f-walk" value={filters.max_walk_min} onChange={change('max_walk_min')} aria-label="Max walking time">
            <option value="">Walk</option>
            <option value="15">≤ 15 min</option>
            <option value="30">≤ 30 min</option>
            <option value="45">≤ 45 min</option>
            <option value="60">≤ 60 min</option>
          </Select>

          <Select className="quick-filter" id="f-price" value={filters.max_price} onChange={change('max_price')} aria-label="Max price per month">
            <option value="">Price</option>
            <option value="10000">≤ MK10,000</option>
            <option value="15000">≤ MK15,000</option>
            <option value="20000">≤ MK20,000</option>
            <option value="25000">≤ MK25,000</option>
          </Select>

          {activeFilters.length > 0 && (
            <button type="button" className="filters-clear" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
      )}

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

      {areasError && <Alert variant="warning">{areasError}</Alert>}

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
