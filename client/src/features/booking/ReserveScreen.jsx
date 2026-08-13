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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { formatMoney } from '../../lib/formatMoney';
import { formatDate } from '../../lib/formatDate';
import { showArea } from '../../lib/area';

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
      <div className="mx-auto flex w-full max-w-measure flex-col gap-6">
        <Card className="gap-3" aria-label="Loading">
          <Skeleton className="h-[var(--text-xl)] w-[70%]" />
          <Skeleton className="h-[var(--text-base)]" />
          <Skeleton className="h-[var(--text-display)] w-[40%] mt-3" />
          <Skeleton className="h-[var(--text-base)]" />
          <Skeleton className="mt-3 h-[var(--control-min-h)]" />
        </Card>
      </div>
    );
  }

  if ((loadError || !room) && !claim) {
    return (
      <div className="mx-auto flex w-full max-w-measure flex-col gap-6">
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
    <div className="mx-auto flex w-full max-w-measure flex-col gap-6">
      <Link to={`/rooms/${room ? room.id : claim.roomId}`} className="w-fit text-sm text-muted-foreground no-underline">
        ← Back to room
      </Link>

      {full ? (
        <Card>
          <Alert className="bg-[var(--color-warning-soft)] text-[var(--color-warning-soft-text)]">
            This room is full right now.
          </Alert>
        </Card>
      ) : !user ? (
        <Card className="gap-3">
          <h1 className="m-0">Sign in</h1>
          <p className="m-0 text-sm text-muted-foreground">
            Sign in once to pay the {formatMoney(BOOKING_FEE)} booking fee and lock the bed.
          </p>
          <GoogleButton onCredential={handleGoogle} />
          {!googleConfigured && (
            <Alert className="bg-[var(--color-warning-soft)] text-[var(--color-warning-soft-text)]">
              Google sign-in is not configured yet.
            </Alert>
          )}
          {authError && <p className="m-0 text-destructive">{authError}</p>}
        </Card>
      ) : !user.phone ? (
        <Card className="gap-3">
          <h1 className="m-0">Your phone number</h1>
          <form onSubmit={handlePhone} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reserve-phone">Phone number</Label>
              <Input
                id="reserve-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0995 123 456"
                required
              />
              {phoneError && <p className="m-0 text-sm text-destructive">{phoneError}</p>}
              <p className="m-0 text-sm text-muted-foreground">We text you about the move-in date.</p>
            </div>
            <Button disabled={savingPhone} className="w-full">
              {savingPhone ? 'Saving…' : 'Continue'}
            </Button>
          </form>
        </Card>
      ) : status === 'paid' ? (
        <Card className="items-center gap-3 text-center">
          <CheckCircle2 className="size-12 text-[var(--color-success)]" aria-hidden="true" />
          <h1 className="m-0">Your bed is secured</h1>
          <p className="m-0 text-muted-foreground">
            {claim.roomName}
            {showArea(claim.roomName, claim.roomArea) ? ` · ${claim.roomArea}` : ''}
          </p>
          {moveIn && <p className="m-0 text-lg font-semibold">Move-in {formatDate(moveIn)}</p>}
          <div className="flex w-full flex-col gap-2 text-sm text-muted-foreground">
            <p className="m-0">The deposit counts toward your rent. The agent fee is separate.</p>
            <p className="m-0">We call to check you&apos;ve settled in, 3 days after move-in.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2">
            <Link to="/bookings" className="w-full">
              <Button variant="ghost" className="w-full">
                My bookings
              </Button>
            </Link>
            <Link to="/" className="w-full">
              <Button className="w-full">Keep browsing</Button>
            </Link>
          </div>
        </Card>
      ) : claimExpired && status === 'requested' ? (
        <Card className="gap-3">
          <Alert variant="destructive">This payment link expired.</Alert>
          <p className="m-0 text-muted-foreground">
            Your spot at {claim.roomName} was released. You can reserve again if the room is still
            available.
          </p>
          <Link to={`/rooms/${claim.roomId}`}>
            <Button className="w-full">Back to room</Button>
          </Link>
        </Card>
      ) : (
        <Card className="gap-3">
          {claim ? (
            <>
              <div className="flex flex-col items-center gap-3 text-center" role="status">
                <Loader2 className="size-[var(--icon-sm)] animate-spin" />
                <p className="m-0 text-lg font-semibold">Complete your payment</p>
                <p className="m-0 font-display text-display leading-[var(--leading-display)] tracking-[var(--tracking-display)]">
                  {formatMoney(claim.payAmount)}
                </p>
                <p className="m-0 text-sm text-muted-foreground">
                  Booking fee for a bed at {claim.roomName}
                  {showArea(claim.roomName, claim.roomArea) ? ` · ${claim.roomArea}` : ''}
                </p>
                <p className="m-0 text-sm text-muted-foreground">
                  The payment window opens above on this page. This page updates by itself once
                  you&apos;re done — your spot is held for 5 minutes.
                </p>
              </div>
              {payError && <Alert variant="destructive">{payError}</Alert>}
              <div className="flex w-full flex-wrap justify-center gap-2">
                <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={cancel} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Cancel'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p className="m-0 text-xl font-semibold">{room.hostel}</p>
                <p className="m-0 text-sm text-muted-foreground">
                  {showArea(room.hostel, room.area) && (
                    <span>
                      {room.area}
                      {room.available_from ? ' · ' : ''}
                    </span>
                  )}
                  {room.available_from && `available ${formatDate(room.available_from)}`}
                </p>
                <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                  <p className="m-0 font-mono text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Booking fee
                  </p>
                  <p className="m-0 text-xl font-bold">{formatMoney(BOOKING_FEE)}</p>
                  <p className="m-0 text-sm text-muted-foreground">
                    {formatMoney(DEPOSIT)} deposit + {formatMoney(AGENT_FEE)} agent fee
                  </p>
                </div>
              </div>
              <p className="m-0 rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
                The deposit counts toward your rent. The agent fee is separate.
              </p>
              {payError && <Alert variant="destructive">{payError}</Alert>}
              <Button onClick={onPay} disabled={claiming} className="w-full">
                {claiming ? 'Reserving…' : `Pay ${formatMoney(BOOKING_FEE)} now`}
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}