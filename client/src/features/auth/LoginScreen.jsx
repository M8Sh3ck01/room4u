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
      <Card className="w-full max-w-md">
        <CardHeader className="items-center pb-6 pt-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl border bg-card shadow-sm">
            <KeyRound className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Sign in to Room4U</CardTitle>
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

          <div className="flex items-center gap-3 text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider">Why Room4U</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {perks.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col items-center gap-2 text-center">
                <span className="flex size-9 items-center justify-center rounded-md border bg-card shadow-sm">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
