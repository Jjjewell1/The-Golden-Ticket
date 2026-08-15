import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { getConfig } from '../lib/api.js';
import Avatar from '../components/Avatar.jsx';
import AvatarPicker from '../components/AvatarPicker.jsx';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [palette, setPalette] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setAvatar(user.avatar || '');
      setPinEnabled(!!user.hasPin);
      setPin('');
    }
  }, [user?.id, user?.hasPin]);

  useEffect(() => {
    getConfig()
      .then((c) => setPalette(c.avatars || []))
      .catch(() => {});
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError('');

    const patch = { displayName: displayName.trim(), avatar };
    if (pinEnabled) {
      if (pin.length === 4) {
        patch.pin = pin;
      } else if (!user.hasPin) {
        setError('Choose a 4-digit PIN to turn on PIN sign-in.');
        setBusy(false);
        return;
      }
    } else if (user.hasPin) {
      patch.pin = '';
    }

    try {
      await updateProfile(patch);
      setPin('');
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">My profile</h1>
        <p className="page-sub">This is your seat — pick an icon or upload a photo, and choose how you&apos;re called on the sign-in screen.</p>
      </div>

      <form className="signup-form mgmt-form" onSubmit={handleSave}>
        <div className="profile-preview-row">
          <Avatar avatar={avatar} name={displayName.trim() || user.username} size={88} />
          <span className="profile-preview-name">{displayName.trim() || user.username}</span>
        </div>

        <label className="field">
          <span className="field-label">Display name</span>
          <input
            type="text"
            value={displayName}
            maxLength={40}
            placeholder={user.username}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <span className="field-hint">Leave blank to show your username.</span>
        </label>

        <div className="field">
          <span className="field-label">Avatar</span>
          <AvatarPicker value={avatar} onChange={setAvatar} palette={palette} name={displayName.trim() || user.username} />
        </div>

        <div className="field pin-toggle-field">
          <label className="mgmt-row mgmt-row-toggle">
            <input type="checkbox" checked={pinEnabled} onChange={(e) => setPinEnabled(e.target.checked)} />
            <div className="mgmt-main">
              <strong>Require a PIN to sign in</strong>
              <span className="mgmt-sub">On the login screen you&apos;ll tap your profile and enter a 4-digit PIN.</span>
            </div>
          </label>
        </div>

        {pinEnabled && (
          <label className="field">
            <span className="field-label">PIN (4 digits)</span>
            <input
              type="password"
              className="pin-field"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={4}
              value={pin}
              placeholder={user.hasPin ? 'Leave blank to keep your current PIN' : 'e.g. 1234'}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <span className="field-hint">
              {user.hasPin
                ? 'A PIN is set. Leave it blank to keep it, or type a new one.'
                : 'Without a PIN, tapping your profile signs you straight in.'}
            </span>
          </label>
        )}

        {error && <div className="banner banner-error">{error}</div>}
        {saved && <div className="banner banner-ok">Profile saved.</div>}

        <button type="submit" className="btn btn-gold" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
