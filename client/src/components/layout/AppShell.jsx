import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export function AppShell() {
  const { user, signOut } = useAuth();

  return (
    <div className="app">
      <header
        className="app-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
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
              <button className="btn btn-ghost" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login">
              <button className="btn">Sign in</button>
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
