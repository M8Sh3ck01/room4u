import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';

export function AuthGate({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center gap-2 p-8">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
