import { useNavigate } from 'react-router-dom';
import { Button } from '../../design/primitives';
import { formatMoney } from '../../lib/formatMoney';
import './booking.css';

const BOOKING_FEE = 20000;

export function ClaimBar({ room }) {
  const navigate = useNavigate();

  if (!room || room.beds_left < 1) {
    return (
      <div className="claim-bar">
        <p className="claim-panel-label">This room</p>
        <p className="claim-hint text-muted">Full right now.</p>
      </div>
    );
  }

  return (
    <div className="claim-bar">
      <Button onClick={() => navigate(`/rooms/${room.id}/reserve`)} fullWidth>
        Reserve this room
      </Button>
      <p className="claim-hint text-muted">
       
      </p>
    </div>
  );
}
