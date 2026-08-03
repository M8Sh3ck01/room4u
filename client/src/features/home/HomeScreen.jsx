import { useEffect, useState } from 'react';
import { listRooms, listAreas } from '../../services/rooms';
import { Card, Field, Select, Input, Button, Alert, Skeleton, EmptyState } from '../../design/primitives';
import { RoomCard } from '../browse/RoomCard';
import '../browse/browse.css';

const EMPTY = { area: '', type: '', max_walk_min: '', available_from: '', max_price: '' };

export function HomeScreen() {
  const [areas, setAreas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [draft, setDraft] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listAreas().then(setAreas).catch(() => {});
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

  const change = (key, autoApply = true) => (e) => {
    const value = e.target.value;
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (autoApply) setFilters(next);
  };

  const apply = (e) => {
    e.preventDefault();
    setFilters({ ...draft });
  };

  const reset = () => {
    setDraft(EMPTY);
    setFilters(EMPTY);
  };

  const resultCount = loading ? null : rooms.length;

  return (
    <div className="browse">
      <div>
        <h1>Student rooms around Mzuzu University</h1>
        <p className="text-muted">
          Honest walking distances from campus, beds left, and a free walking-directions link on
          every room.
        </p>
      </div>

      <Card className="filters">
        <form onSubmit={apply}>
          <h2 className="filters-title">Filters</h2>
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

            <Field label="Move-in date" htmlFor="f-avail">
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
                onChange={change('max_price', false)}
              />
            </Field>

            <div className="filters-actions">
              <Button type="submit">Apply</Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Reset
              </Button>
              {resultCount !== null && (
                <span className="text-muted">
                  {resultCount} room{resultCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        </form>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="room-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="skeleton-card" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card>
          <EmptyState
            title="No rooms match your filters"
            body="Try widening the price or walking distance, or pick another area."
            action={
              <Button variant="ghost" onClick={reset}>
                Clear filters
              </Button>
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
  );
}
