import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRoom } from '../../services/rooms';
import { updateMe } from '../../services/auth';
import {
  claimRoom,
  getBooking,
  cancelBooking,
  makeIdempotencyKey,
  CLAIM_STORAGE_KEY,
  getCachedClaim,
  simulatePayment,
} from '../../services/bookings';
import { useAuth } from '../auth/AuthContext';
import { GoogleButton } from '../auth/GoogleButton';
import { Button, Card, Field, Input, Alert, EmptyState, Skeleton, Spinner } from '../../design/primitives';
import { CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../../lib/formatMoney';
import { formatDate } from '../../lib/formatDate';
import { showArea } from '../../lib/area';
import './booking.css';

const BOOKING_FEE = 20000;
const DEPOSIT = 10000;
const AGENT_FEE = 10000;
const POLL_MS = 4000;

export function ReserveScreen() {
  const { id } = useParams();
  const { user, signIn, setUserFromResponse } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [claim, setClaim] = useState(null);
  const [booking, setBooking] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [payError, setPayError] = useState(null);
  const [payWindowBlocked, setPayWindowBlocked] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getRoom(id)
      .then((data) => {
        if (!cancelled) setRoom(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleGoogle = useCallback(
    async (credential) => {
      setAuthBusy(true);
      setAuthError(null);
      try {
        await signIn({ google: credential });
      } catch (err) {
        setAuthError(err.message);
      } finally {
        setAuthBusy(false);
      }
    },
    [signIn]
  );

  const handleDev = useCallback(
    async (e) => {
      e.preventDefault();
      setAuthBusy(true);
      setAuthError(null);
      try {
        await signIn({ dev: { email, name } });
      } catch (err) {
        setAuthError(err.message);
      } finally {
        setAuthBusy(false);
      }
    },
    [signIn, email, name]
  );

  const handlePhone = useCallback(
    async (e) => {
      e.preventDefault();
      setSavingPhone(true);
      setPhoneError(null);
      try {
        const res = await updateMe({ phone: phone.trim() });
        setUserFromResponse(res);
      } catch (err) {
        setPhoneError(err.message);
      } finally {
        setSavingPhone(false);
      }
    },
    [phone, setUserFromResponse]
  );

  const cachedClaim = user && user.phone && room ? getCachedClaim(room.id) : null;

  useEffect(() => {
    if (!claim && cachedClaim) setClaim(cachedClaim);
  }, [claim, cachedClaim]);

  const status = booking ? booking.status : claim ? 'requested' : null;

  useEffect(() => {
    if (!claim || status !== 'requested') return;
    let cancelled = false;
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      try {
        const data = await getBooking(claim.bookingId);
        if (cancelled) return;
        setBooking(data);
        if (data.status === 'cancelled') {
          try {
            sessionStorage.removeItem(CLAIM_STORAGE_KEY);
          } catch {
            // storage unavailable
          }
        }
      } catch (err) {
        if (!cancelled) setPayError(err.message);
      } finally {
        busy = false;
      }
    };
    run();
    const t = setInterval(run, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [claim, status]);

  const onPay = useCallback(
    async (win) => {
      if (claim) return;
      setClaiming(true);
      setPayError(null);
      setPayWindowBlocked(false);
      const idempotencyKey = makeIdempotencyKey();
      const openPayment = (link) => {
        if (win && !win.closed) {
          win.location = link;
        } else {
          setPayWindowBlocked(true);
        }
      };
      try {
        const res = await claimRoom(room.id, idempotencyKey);
        const claimData = {
          bookingId: res.booking.id,
          roomId: room.id,
          roomName: room.hostel,
          roomArea: room.area,
          availableFrom: room.available_from,
          payAmount: res.pay_amount,
          paymentLink: res.payment_link,
          idempotencyKey,
        };
        try {
          sessionStorage.setItem(CLAIM_STORAGE_KEY, JSON.stringify(claimData));
        } catch {
          // storage unavailable
        }
        setClaim(claimData);
        openPayment(claimData.paymentLink);
      } catch (err) {
        if (err.code === 'CONFLICT') {
          const existing = getCachedClaim(room.id);
          if (existing) {
            setClaim(existing);
            openPayment(existing.paymentLink);
            return;
          }
        }
        if (win && !win.closed) win.close();
        setPayError(err.message);
      } finally {
        setClaiming(false);
      }
    },
    [claim, room]
  );

  const simulate = useCallback(async () => {
    if (!claim) return;
    setSimulating(true);
    setPayError(null);
    try {
      await simulatePayment(claim.bookingId);
      setBooking(await getBooking(claim.bookingId));
    } catch (err) {
      setPayError(err.message);
    } finally {
      setSimulating(false);
    }
  }, [claim]);

  const cancel = useCallback(async () => {
    if (!claim) return;
    setCancelling(true);
    setPayError(null);
    try {
      setBooking(await cancelBooking(claim.bookingId));
      try {
        sessionStorage.removeItem(CLAIM_STORAGE_KEY);
      } catch {
        // storage unavailable
      }
    } catch (err) {
      setPayError(err.message);
    } finally {
      setCancelling(false);
    }
  }, [claim]);

  if (loading) {
    return (
      <div className="reserve center measure">
        <Card className="reserve-skeleton" aria-label="Loading">
          <Skeleton className="reserve-skeleton-room" />
          <Skeleton className="reserve-skeleton-line reserve-skeleton-line--short" />
          <Skeleton className="reserve-skeleton-amount" />
          <Skeleton className="reserve-skeleton-line" />
          <Skeleton className="reserve-skeleton-btn" />
        </Card>
      </div>
    );
  }

  if (loadError || !room) {
    return (
      <div className="reserve center measure">
        <Card>
          <EmptyState
            title="Room not available"
            body={loadError || 'This room could not be found.'}
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

  const full = room.beds_left < 1;
  const moveIn = booking?.move_in_date || claim?.availableFrom;

  return (
    <div className="reserve center measure">
      <Link to={`/rooms/${room.id}`} className="reserve-back">
        ← Back to room
      </Link>

      {full ? (
        <Card className="stack">
          <Alert variant="warning">This room is full right now.</Alert>
        </Card>
      ) : !user ? (
        <Card className="reserve-step">
          <h1 className="reserve-title">Sign in</h1>
          <p className="claim-hint text-muted">
            Sign in once to pay the {formatMoney(BOOKING_FEE)} booking fee and lock the bed.
          </p>
          <GoogleButton onCredential={handleGoogle} />
          {!googleConfigured && (
            <form onSubmit={handleDev} className="stack">
              <Field label="Email" htmlFor="reserve-email">
                <Input
                  id="reserve-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  required
                />
              </Field>
              <Field label="Name (optional)" htmlFor="reserve-name">
                <Input
                  id="reserve-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Chisomo Banda"
                />
              </Field>
              {authError && <p className="text-error">{authError}</p>}
              <Button loading={authBusy} fullWidth>
                {authBusy ? 'Signing in…' : 'Continue'}
              </Button>
            </form>
          )}
          {googleConfigured && authError && <p className="text-error">{authError}</p>}
        </Card>
      ) : !user.phone ? (
        <Card className="reserve-step">
          <h1 className="reserve-title">Your phone number</h1>
          <form onSubmit={handlePhone} className="stack">
            <Field
              label="Phone number"
              htmlFor="reserve-phone"
              error={phoneError}
              hint="We text you about the move-in date."
            >
              <Input
                id="reserve-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0995 123 456"
                required
              />
            </Field>
            <Button loading={savingPhone} fullWidth>
              {savingPhone ? 'Saving…' : 'Continue'}
            </Button>
          </form>
        </Card>
      ) : status === 'paid' ? (
        <Card className="pay-success">
          <CheckCircle2 className="pay-success-icon" aria-hidden="true" />
          <h1 className="pay-success-title">Your bed is secured</h1>
          <p className="text-muted">
            {claim.roomName}
            {showArea(claim.roomName, claim.roomArea) ? ` · ${claim.roomArea}` : ''}
          </p>
          {moveIn && <p className="pay-success-movein">Move-in {formatDate(moveIn)}</p>}
          <div className="pay-success-facts">
            <p>Rent is separate. You pay it directly to the landlord.</p>
            <p>We call to check you&apos;ve settled in, 3 days after move-in.</p>
          </div>
          <div className="pay-actions">
            <Link to={`/rooms/${claim.roomId}`}>
              <Button variant="ghost" fullWidth>
                Back to room
              </Button>
            </Link>
            <Link to="/">
              <Button fullWidth>Keep browsing</Button>
            </Link>
          </div>
        </Card>
      ) : status === 'cancelled' ? (
        <Card className="stack">
          <Alert variant="danger">This claim was cancelled.</Alert>
          <p className="text-muted">
            Your spot at {claim.roomName} was released. You can try again if the room is still
            available.
          </p>
          <Link to={`/rooms/${claim.roomId}`}>
            <Button fullWidth>Back to room</Button>
          </Link>
        </Card>
      ) : (
        <Card className="reserve-step">
          {claim ? (
            <>
              <div className="pay-hero" role="status">
                <Spinner className="pay-hero-spinner" />
                <p className="pay-hero-title">Approve the payment on your phone</p>
                <p className="pay-hero-amount">{formatMoney(claim.payAmount)}</p>
                <p className="pay-hero-meta">
                  Booking fee for a bed at {claim.roomName}
                  {showArea(claim.roomName, claim.roomArea) ? ` · ${claim.roomArea}` : ''}
                </p>
                <p className="pay-hero-note">Then come back. This page updates by itself.</p>
              </div>
              {payError && <Alert variant="danger">{payError}</Alert>}
              {payWindowBlocked && (
                <p className="pay-window-fallback">
                  Payment didn&apos;t open?{' '}
                  <a href={claim.paymentLink} target="_blank" rel="noreferrer">
                    Tap here.
                  </a>
                </p>
              )}
              <div className="pay-actions pay-actions--center">
                <Button variant="ghost-danger" onClick={cancel} loading={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Cancel this claim'}
                </Button>
                {import.meta.env.DEV && (
                  <Button variant="ghost" onClick={simulate} loading={simulating}>
                    {simulating ? 'Simulating…' : 'Simulate payment (dev)'}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="reserve-summary">
                <p className="reserve-summary-room">{room.hostel}</p>
                <p className="reserve-summary-meta text-muted">
                  {showArea(room.hostel, room.area) && (
                    <span>
                      {room.area}
                      {room.available_from ? ' · ' : ''}
                    </span>
                  )}
                  {room.available_from && `available ${formatDate(room.available_from)}`}
                </p>
                <div className="claim-fee">
                  <p className="claim-fee-label">Booking fee</p>
                  <p className="claim-fee-amount">{formatMoney(BOOKING_FEE)}</p>
                  <p className="claim-fee-note">
                    {formatMoney(DEPOSIT)} deposit + {formatMoney(AGENT_FEE)} agent fee
                  </p>
                </div>
              </div>
              <p className="pay-trust">The booking fee is part of the rental fee.</p>
              {payError && <Alert variant="danger">{payError}</Alert>}
              <Button
                onClick={(e) => {
                  const win = window.open('', '_blank');
                  onPay(win);
                }}
                loading={claiming}
                fullWidth
              >
                {claiming ? 'Reserving…' : `Pay ${formatMoney(BOOKING_FEE)} now`}
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
