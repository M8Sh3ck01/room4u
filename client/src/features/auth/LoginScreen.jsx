import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { GoogleButton } from './GoogleButton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound } from 'lucide-react';
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center pb-6 pt-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center justify-self-center rounded-xl border bg-card shadow-sm">
            <KeyRound className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Sign in to Room4U</CardTitle>
          <CardDescription className="max-w-xs">
            Find and claim your room near Mzuzu University.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 pb-8">
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
