import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Spinner } from '../../design/primitives';

export function AuthGate({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="gate-loading">
        <Spinner />
        <span className="text-muted">Loading…</span>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
