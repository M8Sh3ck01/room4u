import { Link, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function AppShell() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const showHeader = pathname !== '/login';
  const showFooter = pathname === '/';
  const onReserve = /\/rooms\/[^/]+\/reserve$/.test(pathname);
  const onBookings = pathname === '/bookings' || pathname.startsWith('/bookings/');
  const onProfile = pathname === '/me';

  return (
    <div className="flex min-h-screen flex-col">
      {showHeader && (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3 md:px-4">
            <Link to="/" className="inline-flex items-center gap-2 text-foreground no-underline" aria-label="Room4U home">
              <span className="text-2xl font-bold tracking-tight whitespace-nowrap">
                Room<span className="text-foreground">4</span>
                <span className="text-foreground">U</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 md:gap-2">
              {user ? (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    aria-label="My bookings"
                    className={cn(
                      'px-2.5 md:px-4',
                      onBookings && 'bg-accent text-foreground hover:bg-accent'
                    )}
                  >
                    <Link to="/bookings" className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                      <span className="hidden md:inline">My bookings</span>
                    </Link>
                  </Button>
                  <Link
                    to="/me"
                    aria-label="My profile"
                    className={cn(
                      'flex items-center gap-2 rounded-full text-sm text-foreground no-underline',
                      onProfile && 'bg-accent'
                    )}
                  >
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      {showFooter && (
        <footer className="border-t border-border bg-muted">
          <div className="mx-auto w-full max-w-5xl px-4 py-12">
            <p className="m-0 mb-2 text-2xl font-bold tracking-tight">
              Room<span className="text-foreground">4</span>
              <span className="text-foreground">U</span>
            </p>
            <p className="m-0 mb-2 text-muted-foreground">Vetted student rooms near Mzuzu University.</p>
            <p className="m-0 font-mono text-xs text-muted-foreground uppercase tracking-wider">
              © {new Date().getFullYear()} Room4U
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}