import { useState } from 'react';
import { useAuth } from './AuthContext';
import { updateMe } from '../../services/auth';
import { Card, Field, Input, Button, Alert } from '../../design/primitives';

export function ProfileScreen() {
  const { user, setUserFromResponse } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const savePhone = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await updateMe({ phone });
      setUserFromResponse(res);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="center measure">
      <div className="stack">
        <h1>My profile</h1>

        {!user.phone && (
          <Alert variant="warning">
            <strong>Add a phone number to continue.</strong> You need a phone to claim a room and
            receive status updates.
          </Alert>
        )}

        <p>
          <span className="text-muted">Name:</span> <strong>{user.name || '—'}</strong>
          <br />
          <span className="text-muted">Email:</span> <strong>{user.email}</strong>
          <br />
          <span className="text-muted">Role:</span> {user.is_operator ? 'Operator' : 'Student'}
        </p>

        <form onSubmit={savePhone} className="stack">
          <Field label="Phone number" htmlFor="phone">
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0888 123 456"
              required
            />
          </Field>
          {error && <p className="text-error">{error}</p>}
          {saved && <p className="text-muted">Saved.</p>}
          <Button loading={saving} fullWidth>
            {saving ? 'Saving…' : 'Save phone'}
          </Button>
        </form>
      </div>
    </Card>
  );
}
