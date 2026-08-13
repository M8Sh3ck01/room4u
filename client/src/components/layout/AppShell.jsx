import { Link, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function AppShell() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const showHeader = pathname !== '/login';
  const showFooter = pathname === '/';
  const onReserve = /\/rooms\/[^/]+\/reserve$/.test(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {showHeader && (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-2.5 md:px-4">
            <Link to="/" className="inline-flex items-center gap-2 text-foreground no-underline" aria-label="Room4U home">
              <span className="text-2xl font-bold tracking-tight whitespace-nowrap">
                Room<span className="text-foreground">4</span>
                <span className="text-foreground">U</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex cursor-pointer items-center gap-2 rounded-full outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 hover:opacity-80"
                      aria-label="Account menu"
                    >
                      <Avatar className="bg-primary text-primary-foreground">
                        {user.avatar_url ? (
                          <AvatarImage src={user.avatar_url} alt="" />
                        ) : (
                          <AvatarFallback>{user.name?.[0] || user.email?.[0]}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="hidden max-w-[16ch] truncate text-sm font-medium md:block">
                        {user.name || user.email}
                      </span>
                      <ChevronDown className="hidden size-4 text-muted-foreground md:block" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <p className="text-sm font-semibold">{user.name || 'Your account'}</p>
                      {user.email && (
                        <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/bookings">
                        <CalendarDays aria-hidden="true" />
                        My bookings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/me">
                        <User aria-hidden="true" />
                        My profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={signOut}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut aria-hidden="true" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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