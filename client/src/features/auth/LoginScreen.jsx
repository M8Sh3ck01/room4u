import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { GoogleButton } from './GoogleButton';

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
    <div className="card" style={{ maxWidth: 380, margin: '2rem auto' }}>
      <h1>Sign in</h1>
      <p className="muted">
        {googleConfigured
          ? 'Sign in with Google to find and claim your room.'
          : 'Google sign-in is not configured yet — use the dev sign-in below.'}
      </p>

      <GoogleButton onCredential={handleGoogle} />

      {!googleConfigured && (
        <form onSubmit={handleDev} style={{ marginTop: '1rem' }}>
          <div className="field">
            <label htmlFor="dev-email">Email</label>
            <input
              id="dev-email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="dev-name">Name (optional)</label>
            <input
              id="dev-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chisomo Banda"
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in (dev)'}
          </button>
        </form>
      )}

      {googleConfigured && error && <p className="error">{error}</p>}
    </div>
  );
}
