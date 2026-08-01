import { useState } from 'react';
import { useAuth } from './AuthContext';
import { updateMe } from '../../services/auth';

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
    <div className="card" style={{ maxWidth: 480 }}>
      <h1>My profile</h1>

      {!user.phone && (
        <div className="gate-banner">
          <strong>Add a phone number to continue.</strong> You need a phone to claim a room and
          receive status updates.
        </div>
      )}

      <p>
        <span className="muted">Name:</span> <strong>{user.name || '—'}</strong>
        <br />
        <span className="muted">Email:</span> <strong>{user.email}</strong>
        <br />
        <span className="muted">Role:</span> {user.is_operator ? 'Operator' : 'Student'}
      </p>

      <form onSubmit={savePhone}>
        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0888 123 456"
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        {saved && <p className="muted">Saved.</p>}
        <button className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save phone'}
        </button>
      </form>
    </div>
  );
}
