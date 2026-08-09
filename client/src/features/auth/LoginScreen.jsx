import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { GoogleButton } from './GoogleButton';
import { Card, Alert } from '../../design/primitives';
import './auth.css';

const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export function LoginScreen() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleGoogle = async (credential) => {
    setBusy(true);
    setError(null);
    try {
      await signIn({ google: credential });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-center">
      <Card className="center measure">
      <div className="stack">
        <h1>Sign in</h1>
        <p className="text-muted">Sign in with Google to find and claim your room.</p>

        {googleConfigured ? <GoogleButton onCredential={handleGoogle} /> : (
          <Alert variant="warning">Google sign-in is not configured yet.</Alert>
        )}

        {error && <p className="text-error">{error}</p>}
        </div>
      </Card>
    </div>
  );
}
