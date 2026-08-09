import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { updateMe } from '../../services/auth';
import { Card, Field, Input, Button, Alert } from '../../design/primitives';
import { normalizePhone, isValidPhone, PHONE_HINT } from '../../lib/phone';
import './auth.css';

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
    <Card className="center measure">
      <div className="stack">
        <div className="profile-head">
          {user?.avatar_url ? (
            <img className="profile-avatar" src={user.avatar_url} alt="" />
          ) : (
            <span className="profile-avatar profile-avatar--fallback" aria-hidden="true">
              {initial}
            </span>
          )}
          <div className="profile-head-text">
            <h1 className="profile-title">{user?.name || 'My profile'}</h1>
          </div>
        </div>

        {!user?.phone && (
          <Alert variant="warning">
            <strong>Add a phone number to continue.</strong> You need a phone to claim a room and
            receive status updates.
          </Alert>
        )}

        <div className="profile-rows">
          <div className="profile-row">
            <span className="profile-row-label">Email</span>
            <span className="profile-row-value">{user?.email}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <Field label="Full name" htmlFor="name">
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
          </Field>
          <Field
            label="Phone number"
            htmlFor="phone"
            hint={PHONE_HINT}
            error={phoneInvalid ? 'Enter a valid Malawi number, e.g. 0888 123 456.' : null}
          >
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
          </Field>
          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
          {saved && (
            <Alert variant="success" role="status">
              Your changes were saved.
            </Alert>
          )}
          <Button type="submit" loading={saving} disabled={!dirty || phoneInvalid} fullWidth>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>

        <div className="profile-signout">
          <Button type="button" variant="ghost-danger" fullWidth onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </Card>
  );
}
