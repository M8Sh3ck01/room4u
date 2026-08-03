import { useEffect, useState } from 'react';
import { listRooms, listAreas } from '../../services/rooms';
import { Card, Field, Select, Input, Button, Alert, Skeleton, EmptyState, Badge } from '../../design/primitives';
import { formatMoney } from '../../lib/formatMoney';
import { RoomCard } from './RoomCard';
import './browse.css';

const EMPTY = { area: '', type: '', max_walk_min: '', available_from: '', max_price: '' };

export function BrowseScreen() {
  const [areas, setAreas] = useState([]);
  const [areasError, setAreasError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [draft, setDraft] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const bp = getComputedStyle(document.documentElement).getPropertyValue('--bp-lg').trim();
    return window.matchMedia(`(min-width: ${bp})`).matches;
  });

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
    const value = e.target.value;
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const apply = (e) => {
    e.preventDefault();
    setFilters({ ...draft });
  };

  const reset = () => {
    setDraft(EMPTY);
    setFilters(EMPTY);
  };

  const activeCount = Object.values(filters).filter((v) => v !== '' && v != null).length;

  const activeFilterSummary = [];
  if (filters.area) {
    const a = areas.find((x) => x.id === filters.area);
    activeFilterSummary.push(`area ${a ? a.name : filters.area}`);
  }
  if (filters.type) activeFilterSummary.push(`type ${filters.type}`);
  if (filters.max_walk_min) activeFilterSummary.push(`walk ≤ ${filters.max_walk_min} min`);
  if (filters.available_from) activeFilterSummary.push(`available from ${filters.available_from}`);
  if (filters.max_price) activeFilterSummary.push(`price ≤ ${formatMoney(filters.max_price)}`);

  const hasFilters = activeFilterSummary.length > 0;

  const emptyTitle = hasFilters ? 'No rooms match your filters' : 'No rooms yet';

  const emptyBody = hasFilters
    ? `Nothing matches ${activeFilterSummary.join(', ')}. Widen a filter or reset.`
    : "We're setting up the first rooms near Mzuzu University. Check back soon.";

  const loaded = !loading && !error;
  const catalogEmpty = loaded && rooms.length === 0 && !hasFilters;
  const showResultsBar = !catalogEmpty;

  return (
    <div className="browse">
      <div>
        <h1>Student rooms near Mzuzu University</h1>
        <p className="text-muted">
          Every room shows the real walk time to campus, with directions to the door.
        </p>
      </div>

      {showResultsBar && (
        <div className="results-bar">
          <button
            type="button"
            className="filters-toggle"
            aria-expanded={open}
            aria-controls="filters-panel"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="filters-toggle-label">Filters</span>
            {activeCount > 0 && <Badge variant="primary">{activeCount}</Badge>}
            <span
              className={open ? 'filters-chevron filters-chevron--open' : 'filters-chevron'}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {!loading && !error && (
            <p className="results-count text-muted" role="status">
              {rooms.length} room{rooms.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}

      {areasError && <Alert variant="warning">{areasError}</Alert>}

      {open && (
        <Card id="filters-panel" className="filters">
          <form onSubmit={apply}>
            <div className="filters-grid">
              <Field label="Area" htmlFor="f-area">
                <Select id="f-area" value={draft.area} onChange={change('area')}>
                  <option value="">All areas</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Room type" htmlFor="f-type">
                <Select id="f-type" value={draft.type} onChange={change('type')}>
                  <option value="">Any</option>
                  <option value="single">Single</option>
                  <option value="shared">Shared</option>
                </Select>
              </Field>

              <Field label="Max walking time" htmlFor="f-walk">
                <Select id="f-walk" value={draft.max_walk_min} onChange={change('max_walk_min')}>
                  <option value="">Any</option>
                  <option value="15">~15 min</option>
                  <option value="30">~30 min</option>
                  <option value="45">~45 min</option>
                  <option value="60">~60 min</option>
                </Select>
              </Field>

              <Field
                label="Available from"
                htmlFor="f-avail"
                hint="Show rooms free on or after this date."
              >
                <Input
                  id="f-avail"
                  type="date"
                  value={draft.available_from}
                  onChange={change('available_from')}
                />
              </Field>

              <Field label="Max price /bed/mo" htmlFor="f-price">
                <Input
                  id="f-price"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 18000"
                  value={draft.max_price}
                  onChange={change('max_price')}
                />
              </Field>

              <div className="filters-actions">
                <Button type="submit">Apply</Button>
                <Button type="button" variant="ghost" onClick={reset}>
                  Reset
                </Button>
              </div>
            </div>
          </form>
        </Card>
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
                  <Button variant="ghost" onClick={reset}>
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
