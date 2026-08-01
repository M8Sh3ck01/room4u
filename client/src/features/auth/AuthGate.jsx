import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function AuthGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted" style={{ padding: '2rem' }}>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
