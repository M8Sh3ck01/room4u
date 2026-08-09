import { useCallback, useEffect, useRef, useState } from 'react';
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
const CLAIM_WINDOW_MINUTES = 5;

export function ReserveScreen() {
  const { id } = useParams();
  const { user, signIn, setUserFromResponse } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [claim, setClaim] = useState(null);
  const [booking, setBooking] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [payError, setPayError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [claimExpired, setClaimExpired] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const claimRef = useRef(null);
  claimRef.current = claim;
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    if (isFirstLoad.current) {
      setLoading(true);
      isFirstLoad.current = false;
    } else {
      setLoadError(null);
    }
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
  }, [id, refreshTick]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.self === window.top) return;
    try {
      const parentDoc = window.parent.document;
      const overlay = parentDoc.getElementById('wrapper') || parentDoc.getElementById('iframe1');
      if (overlay) overlay.remove();
      window.parent.postMessage({ type: 'room4u:payment-return' }, window.location.origin);
    } catch {
      // cross-origin or already closed
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.self !== window.top) return;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data && event.data.type === 'room4u:payment-return') {
        setRefreshTick((t) => t + 1);
        const currentClaim = claimRef.current;
        if (currentClaim) {
          getBooking(currentClaim.bookingId)
            .then((data) => setBooking(data))
            .catch(() => {});
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleGoogle = useCallback(
    async (credential) => {
      setAuthError(null);
      try {
        await signIn({ google: credential });
      } catch (err) {
        setAuthError(err.message);
      }
    },
    [signIn]
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

  const cachedClaim = user && user.phone ? getCachedClaim(id) : null;

  useEffect(() => {
    if (!claim && cachedClaim) setClaim(cachedClaim);
  }, [claim, cachedClaim]);

  const status = booking ? booking.status : claim ? 'requested' : null;

  useEffect(() => {
    if (!claim || status !== 'requested') return;
    const deadline =
      Number(claim.expiresAt) ||
      Date.now() + CLAIM_WINDOW_MINUTES * 60 * 1000;
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
          setClaim(null);
          setBooking(null);
          setClaimExpired(false);
        } else if (data.status === 'requested' && Date.now() >= deadline) {
          setClaimExpired(true);
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

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load the payment provider. Try again.'));
      document.head.appendChild(script);
    });

  const loadPaychanguScript = async () => {
    if (typeof window !== 'undefined' && window.PaychanguCheckout) return;
    await loadScript('https://code.jquery.com/jquery-3.7.1.min.js');
    await loadScript('https://in.paychangu.com/js/popup.js');
  };

  const openInlineCheckout = useCallback(
    async (claimData) => {
      const publicKey = import.meta.env.VITE_PAYCHANGU_PUBLIC_KEY;
      if (!publicKey) {
        setPayError('Payment gateway is not configured for this build.');
        return;
      }
      try {
        await loadPaychanguScript();
        if (!document.getElementById('wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.id = 'wrapper';
          document.body.appendChild(wrapper);
        }
        const [firstName, ...rest] = (user.name || '').trim().split(/\s+/);
        window.PaychanguCheckout({
          public_key: publicKey,
          tx_ref: claimData.txRef,
          amount: claimData.payAmount,
          currency: 'MWK',
          callback_url: `${window.location.origin}/api/paychangu/return`,
          return_url: `${window.location.origin}/rooms/${claimData.roomId}/reserve`,
          customer: {
            email: user.email,
            ...(firstName ? { first_name: firstName } : {}),
            ...(rest.length ? { last_name: rest.join(' ') } : {}),
          },
          customization: {
            title: 'Room4U booking fee',
            description: `Booking fee for a bed at ${claimData.roomName}`,
          },
        });
      } catch (err) {
        setPayError(err.message);
      }
    },
    [user]
  );

  const onPay = useCallback(async () => {
    if (claim) return;
    setClaiming(true);
    setPayError(null);
    const idempotencyKey = makeIdempotencyKey();
    try {
      const res = await claimRoom(room.id, idempotencyKey);
      const claimData = {
        bookingId: res.booking.id,
        roomId: room.id,
        roomName: room.hostel,
        roomArea: room.area,
        availableFrom: room.available_from,
        payAmount: res.pay_amount,
        txRef: res.tx_ref,
        idempotencyKey,
        expiresAt: Date.now() + CLAIM_WINDOW_MINUTES * 60 * 1000,
      };
      try {
        sessionStorage.setItem(CLAIM_STORAGE_KEY, JSON.stringify(claimData));
      } catch {
        // storage unavailable
      }
      setClaim(claimData);
      await openInlineCheckout(claimData);
    } catch (err) {
      if (err.code === 'CONFLICT') {
        const existing = getCachedClaim(room.id);
        if (existing) {
          setClaim(existing);
          await openInlineCheckout(existing);
          return;
        }
      }
      setPayError(err.message);
    } finally {
      setClaiming(false);
    }
  }, [claim, room, openInlineCheckout]);

  const cancel = useCallback(async () => {
    if (!claim) return;
    setCancelling(true);
    setPayError(null);
    try {
      await cancelBooking(claim.bookingId);
      try {
        sessionStorage.removeItem(CLAIM_STORAGE_KEY);
      } catch {
        // storage unavailable
      }
      setClaim(null);
      setBooking(null);
      setClaimExpired(false);
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

  if ((loadError || !room) && !claim) {
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

  const full = room ? room.beds_left < 1 : false;
  const moveIn = booking?.move_in_date || claim?.availableFrom;

  return (
    <div className="reserve center measure">
      <Link to={`/rooms/${room ? room.id : claim.roomId}`} className="reserve-back">
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
            <Alert variant="warning">Google sign-in is not configured yet.</Alert>
          )}
          {authError && <p className="text-error">{authError}</p>}
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
            <p>The deposit counts toward your rent. The agent fee is separate.</p>
            <p>We call to check you&apos;ve settled in, 3 days after move-in.</p>
          </div>
          <div className="pay-actions">
            <Link to="/bookings">
              <Button variant="ghost" fullWidth>
                My bookings
              </Button>
            </Link>
            <Link to="/">
              <Button fullWidth>Keep browsing</Button>
            </Link>
          </div>
        </Card>
      ) : claimExpired && status === 'requested' ? (
        <Card className="stack">
          <Alert variant="danger">This payment link expired.</Alert>
          <p className="text-muted">
            Your spot at {claim.roomName} was released. You can reserve again if the room is still
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
                <p className="pay-hero-title">Complete your payment</p>
                <p className="pay-hero-amount">{formatMoney(claim.payAmount)}</p>
                <p className="pay-hero-meta">
                  Booking fee for a bed at {claim.roomName}
                  {showArea(claim.roomName, claim.roomArea) ? ` · ${claim.roomArea}` : ''}
                </p>
                <p className="pay-hero-note">
                  The payment window opens above on this page. This page updates by itself once
                  you&apos;re done — your spot is held for 5 minutes.
                </p>
              </div>
              {payError && <Alert variant="danger">{payError}</Alert>}
              <div className="pay-actions pay-actions--center">
                <Button variant="ghost-danger" onClick={cancel} loading={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Cancel'}
                </Button>
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
              <p className="pay-trust">The deposit counts toward your rent. The agent fee is separate.</p>
              {payError && <Alert variant="danger">{payError}</Alert>}
              <Button onClick={onPay} loading={claiming} fullWidth>
                {claiming ? 'Reserving…' : `Pay ${formatMoney(BOOKING_FEE)} now`}
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
