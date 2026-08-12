import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { GoogleButton } from './GoogleButton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    <div className="mx-auto flex min-h-dvh w-full max-w-measure flex-col items-center justify-center px-4 py-6">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-3xl uppercase">Sign in</CardTitle>
          <CardDescription>Sign in with Google to find and claim your room.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {googleConfigured ? (
            <GoogleButton onCredential={handleGoogle} />
          ) : (
            <Alert variant="destructive">
              <AlertDescription>Google sign-in is not configured yet.</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
