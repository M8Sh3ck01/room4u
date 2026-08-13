import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function AppShell() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const showHeader = pathname !== '/login';
  const showFooter = pathname === '/';
  const onReserve = /\/rooms\/[^/]+\/reserve$/.test(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {showHeader && (
        <header className="sticky top-0 z-[var(--z-header)] border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[var(--bp-lg)] items-center justify-between gap-2 px-4 py-3 md:px-4">
            <Link to="/" className="inline-flex items-center gap-2 text-foreground no-underline" aria-label="Room4U home">
              <span className="font-display text-2xl leading-none tracking-tight whitespace-nowrap uppercase">
                Room<span className="text-foreground">4</span>
                <span className="text-foreground">U</span>
              </span>
            </Link>
            <div className="flex items-center gap-2 md:gap-3">
              {user ? (
                <>
                  <Link to="/bookings" className="text-sm text-muted-foreground no-underline whitespace-nowrap hover:text-foreground">
                    My bookings
                  </Link>
                  <Link to="/me" className="flex items-center gap-2 text-sm text-foreground no-underline">
                    <Avatar className="bg-primary text-primary-foreground">
                      {user.avatar_url ? (
                        <AvatarImage src={user.avatar_url} alt="" />
                      ) : (
                        <AvatarFallback>{user.name?.[0] || user.email?.[0]}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="hidden max-w-[20ch] overflow-hidden text-ellipsis whitespace-nowrap md:block">
                      {user.name || user.email}
                    </span>
                  </Link>
                </>
              ) : !onReserve ? (
                <Link to="/login">
                  <Button size="sm">Sign in</Button>
                </Link>
              ) : null}
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-[var(--bp-lg)] flex-1 px-4 py-6">
        <Outlet />
      </main>
      {showFooter && (
        <footer className="border-t border-border bg-muted">
          <div className="mx-auto w-full max-w-[var(--bp-lg)] px-4 py-12">
            <p className="m-0 mb-2 font-display text-display leading-[var(--leading-display)] tracking-[var(--tracking-display)] uppercase">
              Room<span className="text-foreground">4</span>
              <span className="text-foreground">U</span>
            </p>
            <p className="m-0 mb-2 text-muted-foreground">Vetted student rooms near Mzuzu University.</p>
            <p className="m-0 font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Â© {new Date().getFullYear()} Room4U
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}