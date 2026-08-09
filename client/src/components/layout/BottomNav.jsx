import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarDays, User } from 'lucide-react';
import './BottomNav.css';

const tabs = [
  { to: '/', label: 'Browse', icon: Home, match: (p) => p === '/' || p.startsWith('/rooms') },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays, match: (p) => p.startsWith('/bookings') },
  { to: '/me', label: 'Profile', icon: User, match: (p) => p === '/me' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map(({ to, label, icon: Icon, match }) => (
        <Link
          key={to}
          to={to}
          className={`bottom-tab${match(pathname) ? ' bottom-tab--active' : ''}`}
        >
          <Icon className="bottom-tab-icon" />
          <span className="bottom-tab-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
