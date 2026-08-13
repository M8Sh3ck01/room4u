import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { updateMe } from '../../services/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { normalizePhone, isValidPhone, PHONE_HINT } from '../../lib/phone';

const warningAlert =
  'border-amber-800 bg-amber-50 text-amber-800';
const successAlert =
  'border-emerald-800 bg-emerald-50 text-emerald-800';

export function ProfileScreen() {
  const { user, setUserFromResponse, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const nameDirty = name.trim() !== (user?.name || '');
  const phoneDirty = normalizePhone(phone) !== (user?.phone || '');
  const dirty = nameDirty || phoneDirty;
  const phoneInvalid = phone.trim() !== '' && !isValidPhone(phone);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phoneInvalid) return;
    const fields = {};
    if (nameDirty) fields.name = name.trim();
    if (phoneDirty) fields.phone = normalizePhone(phone);
    if (Object.keys(fields).length === 0) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await updateMe(fields);
      setUserFromResponse(res);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const initial = (user?.name || user?.email || '?')[0]?.toUpperCase() || '?';

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <Avatar className="size-14">
              <AvatarImage src={user.avatar_url} alt="" />
            </Avatar>
          ) : (
            <Avatar className="size-14">
              <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {user?.name || 'My profile'}
            </h1>
          </div>
        </div>

        {!user?.phone && (
          <Alert className={warningAlert}>
            <AlertTitle>Add a phone number to continue.</AlertTitle>
            <AlertDescription>You need a phone to claim a room and receive status updates.</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              readOnly
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              placeholder="Chisomo Banda"
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSaved(false);
              }}
              placeholder="0888 123 456"
              autoComplete="tel"
              aria-invalid={phoneInvalid || undefined}
            />
            {phoneInvalid ? (
              <p className="text-sm text-destructive">Enter a valid Malawi number, e.g. 0888 123 456.</p>
            ) : (
              <p className="text-sm text-muted-foreground">{PHONE_HINT}</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert className={successAlert} role="status">
              <AlertDescription>Your changes were saved.</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={!dirty || phoneInvalid || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>

        <div className="border-t border-border pt-6">
          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive border-destructive/40 hover:border-destructive/60"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
