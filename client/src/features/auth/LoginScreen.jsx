import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { GoogleButton } from './GoogleButton';
import { Card, Field, Input, Button } from '../../design/primitives';

const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export function LoginScreen() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
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

  const handleDev = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn({ dev: { email, name } });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="center measure">
      <div className="stack">
        <h1>Sign in</h1>
        <p className="text-muted">
          {googleConfigured
            ? 'Sign in with Google to find and claim your room.'
            : 'Google sign-in is not configured yet use the dev sign-in below.'}
        </p>

        <GoogleButton onCredential={handleGoogle} />

        {!googleConfigured && (
          <form onSubmit={handleDev} className="stack">
            <Field label="Email" htmlFor="dev-email">
              <Input
                id="dev-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                required
              />
            </Field>
            <Field label="Name (optional)" htmlFor="dev-name">
              <Input
                id="dev-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chisomo Banda"
              />
            </Field>
            {error && <p className="text-error">{error}</p>}
            <Button loading={busy} fullWidth>
              {busy ? 'Signing in…' : 'Sign in (dev)'}
            </Button>
          </form>
        )}

        {googleConfigured && error && <p className="text-error">{error}</p>}
      </div>
    </Card>
  );
}
