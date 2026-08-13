import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { GoogleButton } from './GoogleButton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, BadgeCheck, Footprints, Banknote } from 'lucide-react';
import './auth.css';

const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const perks = [
  { icon: BadgeCheck, title: 'Verified', body: 'Every listing is checked before it goes live.' },
  { icon: Footprints, title: 'Walkable', body: 'A short walk from Mzuzu University.' },
  { icon: Banknote, title: 'Affordable', body: 'Priced for a student budget.' },
];

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
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl border bg-card shadow-sm">
            <KeyRound className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Sign in to Room4U</CardTitle>
          <CardDescription>Find and claim your room near Mzuzu University.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
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

          <div className="flex flex-col gap-4 border-t pt-6">
            {perks.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
