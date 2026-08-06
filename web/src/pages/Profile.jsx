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
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setAvatar(user.avatar || '');
    }
  }, [user?.id]);

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
    try {
      await updateProfile({ displayName: displayName.trim(), avatar });
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

        {error && <div className="banner banner-error">{error}</div>}
        {saved && <div className="banner banner-ok">Profile saved.</div>}

        <button type="submit" className="btn btn-gold" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
