import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatMoney } from '../../lib/formatMoney';

const BOOKING_FEE = 20000;

export function ClaimBar({ room }) {
  const navigate = useNavigate();

  if (!room || room.beds_left < 1) {
    return (
      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <p className="m-0 font-mono text-xs font-medium text-muted-foreground uppercase tracking-wider">
          This room
        </p>
        <p className="m-0 text-sm text-muted-foreground">Full right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <Button onClick={() => navigate(`/rooms/${room.id}/reserve`)} className="w-full">
        Reserve this room
      </Button>
      <p className="m-0 text-sm text-muted-foreground">{formatMoney(BOOKING_FEE)} booking fee</p>
    </div>
  );
}