import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../design/primitives';
import { BottomNav } from './BottomNav';
import './AppShell.css';

export function AppShell() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const showHeader = pathname !== '/login';
  const showFooter = pathname === '/';
  const onReserve = /\/rooms\/[^/]+\/reserve$/.test(pathname);

  return (
    <div className="app">
      {showHeader && (
        <header className="app-header">
        <Link to="/" className="brand" aria-label="Room4U home">
          <span className="brand-name">
            Room<span className="brand-name-num">4</span>
            <span className="brand-name-accent">U</span>
          </span>
        </Link>
        <div className="header-actions">
          {user ? (
            <>
              <Link to="/bookings" className="header-link">
                My bookings
              </Link>
              <Link to="/me" className="header-user">
                {user.avatar_url ? (
                  <img className="header-avatar" src={user.avatar_url} alt="" />
                ) : (
                  <span className="header-avatar">{user.name?.[0] || user.email?.[0]}</span>
                )}
                <span>{user.name || user.email}</span>
              </Link>
              
            </>
          ) : !onReserve ? (
            <Link to="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          ) : null}
        </div>
        </header>
      )}
      <main className="app-main">
        <Outlet />
      </main>
      {user && <BottomNav />}
      {showFooter && (
        <footer className="app-footer">
          <div className="app-footer-inner">
            <p className="app-footer-brand">
              Room<span className="app-footer-brand-num">4</span>
              <span className="app-footer-brand-accent">U</span>
            </p>
            <p className="app-footer-about">Vetted student rooms near Mzuzu University.</p>
            <p className="app-footer-line app-footer-copy">© {new Date().getFullYear()} Room4U</p>
          </div>
        </footer>
      )}
    </div>
  );
}
