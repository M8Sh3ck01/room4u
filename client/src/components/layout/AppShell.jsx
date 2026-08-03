import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../design/primitives';
import './AppShell.css';

export function AppShell() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const showFooter = pathname === '/';

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand" aria-label="Room4U home">
          <span className="brand-name">
            Room4<span className="brand-name-accent">U</span>
          </span>
        </Link>
        <div className="header-actions">
          {user ? (
            <>
              <Link to="/me" className="header-user">
                {user.avatar_url ? (
                  <img className="header-avatar" src={user.avatar_url} alt="" />
                ) : (
                  <span className="header-avatar">{user.name?.[0] || user.email?.[0]}</span>
                )}
                <span>{user.name || user.email}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      {showFooter && (
        <footer className="app-footer">
          <div className="app-footer-inner">
            <p className="app-footer-brand">
              Room4<span className="app-footer-brand-accent">U</span>
            </p>
            <p className="app-footer-about">Vetted student rooms near Mzuzu University.</p>
            <p className="app-footer-line">Areas: Chibavi · Katoto · Luwinga</p>
            <p className="app-footer-line app-footer-copy">© {new Date().getFullYear()} Room4U</p>
          </div>
        </footer>
      )}
    </div>
  );
}
