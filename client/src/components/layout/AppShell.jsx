import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../design/primitives';
import './AppShell.css';

export function AppShell() {
  const { user, signOut } = useAuth();

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          Room4U
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
    </div>
  );
}
