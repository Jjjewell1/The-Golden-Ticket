import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import {
  getConfig,
  getOwnerRequests,
  getOwnerUsers,
  postOwnerAddUser,
  postOwnerDecision,
  postOwnerUserAction,
  patchOwnerUser,
} from '../lib/api.js';
import AppCard from '../components/AppCard.jsx';
import Avatar from '../components/Avatar.jsx';
import AvatarPicker from '../components/AvatarPicker.jsx';

function fmt(d) {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Owner() {
  const { user } = useAuth();
  const [ownerApps, setOwnerApps] = useState([]);
  const [avatars, setAvatars] = useState([]);
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState({});
  const [addForm, setAddForm] = useState({ username: '', email: '', password: '' });
  const [editing, setEditing] = useState(null);

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    getConfig()
      .then((c) => {
        setOwnerApps(c.ownerApps || []);
        setAvatars(c.avatars || []);
      })
      .catch(() => {});
  }, []);

  const reload = () => {
    if (isOwner) {
      Promise.allSettled([getOwnerRequests(), getOwnerUsers()]).then(([r, u]) => {
        if (r.status === 'fulfilled') setRequests(r.value.requests || []);
        if (u.status === 'fulfilled') setMembers(u.value.users || []);
      });
    }
  };

  useEffect(() => {
    reload();
  }, [isOwner]);

  async function decide(request, action) {
    setBusy(true);
    setError('');
    const { ok, data } = await postOwnerDecision(request.id, { action, note: note[request.id] || '' });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }
    reload();
  }

  async function userAction(member, action) {
    setBusy(true);
    setError('');
    const { ok, data } = await postOwnerUserAction(member.id, action);
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }
    reload();
  }

  function openEdit(member) {
    setError('');
    setEditing({
      id: member.id,
      displayName: member.displayName || '',
      avatar: member.avatar || '',
      email: member.email || '',
      password: '',
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError('');
    const payload = {
      displayName: editing.displayName.trim(),
      avatar: editing.avatar,
    };
    if (editing.email && editing.email !== members.find((m) => m.id === editing.id)?.email) {
      payload.email = editing.email;
    }
    if (editing.password) payload.password = editing.password;
    const { ok, data } = await patchOwnerUser(editing.id, payload);
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }
    setEditing(null);
    reload();
  }

  async function addMember(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { ok, data } = await postOwnerAddUser(addForm);
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }
    setAddForm({ username: '', email: '', password: '' });
    reload();
  }

  if (!isOwner) {
    return (
      <div className="page">
        <div className="owner-gate">
          <div className="owner-gate-icon" aria-hidden="true">🔒</div>
          <h1 className="page-title">Owner&apos;s only</h1>
          <p className="page-sub">This section is for the keeper of the server.</p>
        </div>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === 'pending');

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Owner&apos;s corner</h1>
        <p className="page-sub">Approve new tickets, manage members, and keep the lights on.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {pending.length > 0 ? (
        <section className="mgmt-section">
          <h2 className="mgmt-title">🎟️ Pending requests</h2>
          <div className="mgmt-list">
            {pending.map((r) => (
              <div key={r.id} className="mgmt-row">
                <div className="mgmt-main">
                  <strong>{r.username}</strong>
                  <span className="mgmt-sub">{r.email} · requested {fmt(r.requestedAt)}</span>
                </div>
                <div className="mgmt-side">
                  <input
                    className="mgmt-note"
                    placeholder="Optional note"
                    value={note[r.id] || ''}
                    onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                  />
                  <button className="btn btn-gold btn-small" disabled={busy} onClick={() => decide(r, 'approve')}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-small" disabled={busy} onClick={() => decide(r, 'deny')}>
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mgmt-section">
        <h2 className="mgmt-title">👥 Members</h2>
        <div className="mgmt-list">
          {members.map((m) => (
            <div key={m.id} className="mgmt-card">
              <div className="mgmt-row">
                <div className="mgmt-main mgmt-main-user">
                  <strong>
                    <Avatar
                      avatar={m.avatar}
                      name={m.displayName || m.username}
                      size={36}
                      className="mgmt-avatar"
                    />
                    {m.displayName || m.username}
                    {m.username !== m.displayName ? <span className="mgmt-user-handle">@{m.username}</span> : null}
                    {m.role === 'owner' ? <span className="mgmt-tag">owner</span> : null}
                    {m.status !== 'active' ? <span className="mgmt-tag mgmt-tag-off">disabled</span> : null}
                  </strong>
                  <span className="mgmt-sub">{m.email || 'no email'}</span>
                </div>
                <div className="mgmt-side">
                  {m.role !== 'owner' ? (
                    <>
                      <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => userAction(m, m.status === 'active' ? 'disable' : 'enable')}>
                        {m.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => userAction(m, 'reset-password')}>
                        Reset password
                      </button>
                    </>
                  ) : null}
                  <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => openEdit(m)}>
                    Edit
                  </button>
                </div>
              </div>

              {editing && editing.id === m.id ? (
                <form className="mgmt-edit" onSubmit={saveEdit}>
                  <div className="mgmt-edit-grid">
                    <label className="field">
                      <span className="field-label">Display name</span>
                      <input
                        type="text"
                        maxLength={40}
                        placeholder={m.username}
                        value={editing.displayName}
                        onChange={(e) => setEditing((ed) => ({ ...ed, displayName: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Email</span>
                      <input
                        type="email"
                        value={editing.email}
                        onChange={(e) => setEditing((ed) => ({ ...ed, email: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">New password</span>
                      <input
                        type="password"
                        placeholder="Leave blank to keep"
                        value={editing.password}
                        autoComplete="new-password"
                        onChange={(e) => setEditing((ed) => ({ ...ed, password: e.target.value }))}
                      />
                      <span className="field-hint">8+ characters. Synced to Jellyfin &amp; RomM.</span>
                    </label>
                  </div>
                  <div className="field">
                    <span className="field-label">Avatar</span>
                    <AvatarPicker
                      value={editing.avatar}
                      onChange={(v) => setEditing((ed) => ({ ...ed, avatar: v }))}
                      palette={avatars}
                      name={editing.displayName.trim() || m.username}
                    />
                  </div>
                  <div className="mgmt-edit-actions">
                    <button type="submit" className="btn btn-gold btn-small" disabled={busy}>
                      Save
                    </button>
                    <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mgmt-section">
        <h2 className="mgmt-title">➕ Add an existing member</h2>
        <p className="mgmt-hint">
          For people who already have a Jellyfin or RomM account (like family members). This sets a fresh password for
          both, so tell them what you pick.
        </p>
        <form className="signup-form mgmt-form" onSubmit={addMember}>
          <Field label="Username" value={addForm.username} onChange={(v) => setAddForm((f) => ({ ...f, username: v }))} />
          <Field label="Email" type="email" value={addForm.email} onChange={(v) => setAddForm((f) => ({ ...f, email: v }))} />
          <Field label="Password" type="password" value={addForm.password} onChange={(v) => setAddForm((f) => ({ ...f, password: v }))} />
          <button type="submit" className="btn btn-gold" disabled={busy}>
            {busy ? 'Adding…' : 'Add member'}
          </button>
        </form>
      </section>

      <section className="mgmt-section">
        <h2 className="mgmt-title">🛠️ Owner tools</h2>
        <div className="app-grid owner-grid">
          {ownerApps.map((app) => (
            <AppCard key={app.name} app={app} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </label>
  );
}
