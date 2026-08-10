import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getOwnerRequests,
  getOwnerUsers,
  getOwnerSettings,
  patchOwnerSettings,
  patchOwnerUser,
  postOwnerDecision,
  postOwnerUserAction,
  postOwnerUserDelete,
  postOwnerTestNotify,
} from '../lib/api.js';
import Avatar from '../components/Avatar.jsx';
import { Reveal } from '../lib/useFx.jsx';

function fmt(t) {
  return new Date(t).toLocaleDateString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Owner() {
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState(null);
  const [users, setUsers] = useState(null);
  const [settings, setSettings] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notify, setNotify] = useState({ busy: false, sent: false, error: '' });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([getOwnerRequests(), getOwnerUsers(), getOwnerSettings()]).then(([r, u, s]) => {
      if (!alive) return;
      if (r.status === 'fulfilled') setRequests(r.value.requests || []);
      if (u.status === 'fulfilled') setUsers(u.value.users || []);
      if (s.status === 'fulfilled') setSettings(s.value);
    });
    return () => {
      alive = false;
    };
  }, []);

  const decide = async (req, action) => {
    const verb = action === 'approve' ? 'approve' : 'deny';
    if (!window.confirm(`Are you sure you want to ${verb} ${req.username}?`)) return;
    setBusyId(req.id);
    const res = await postOwnerDecision(req.id, { action });
    setBusyId(null);
    if (!res.ok) {
      window.alert(res.data.error || 'Could not decide that request.');
      return;
    }
    const fresh = await getOwnerRequests();
    setRequests(fresh.requests || []);
  };

  const toggleAnnouncement = async (a) => {
    const list = (settings?.announcements || []).map((x) =>
      x.id === a.id ? { ...x, enabled: !x.enabled } : x,
    );
    setSaving(true);
    const res = await patchOwnerSettings({ announcements: list });
    setSaving(false);
    if (res.ok) setSettings({ ...settings, announcements: res.data.announcements });
  };

  const sendTestNotification = async () => {
    setNotify({ busy: true, sent: false, error: '' });
    const res = await postOwnerTestNotify();
    if (res.ok) {
      setNotify({ busy: false, sent: true, error: '' });
    } else {
      setNotify({ busy: false, sent: false, error: res.data.error || 'Could not send the test notification.' });
    }
  };

  const userAction = async (u, action, label) => {
    if (!window.confirm(`${label} ${u.username}?`)) return;
    setBusyId(u.id);
    const res = await postOwnerUserAction(u.id, action);
    setBusyId(null);
    if (!res.ok) {
      window.alert(res.data.error || 'That did not work.');
      return;
    }
    const fresh = await getOwnerUsers();
    setUsers(fresh.users || []);
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Permanently delete ${u.username}?\n\nThis removes their Jellyfin, RomM and site accounts. This cannot be undone.`)) {
      return;
    }
    setBusyId(u.id);
    const res = await postOwnerUserDelete(u.id);
    setBusyId(null);
    if (!res.ok) {
      window.alert(res.data.error || 'Could not delete that member.');
      return;
    }
    const fresh = await getOwnerUsers();
    setUsers(fresh.users || []);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setBusyId(editing.id);
    const payload = {
      displayName: editing.displayName ?? '',
      email: editing.email.trim(),
    };
    if (editing.password) payload.password = editing.password;
    const res = await patchOwnerUser(editing.id, payload);
    setBusyId(null);
    if (!res.ok) {
      window.alert(res.data.error || 'Could not save those changes.');
      return;
    }
    const fresh = await getOwnerUsers();
    setUsers(fresh.users || []);
    setEditing(null);
  };

  const pendingCount = (requests || []).filter((r) => r.status === 'pending').length;
  const statusTag = (status) =>
    status === 'pending' ? 'waiting on you' : status === 'denied' ? 'denied' : 'approved';

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Owner panel</h1>
        <p className="page-sub">Requests, members and site settings.</p>
      </div>

      <div className="tab-row">
        <button type="button" className={`tab${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
          Requests {pendingCount > 0 ? `(${pendingCount})` : ''}
        </button>
        <button type="button" className={`tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>
          Members
        </button>
        <button type="button" className={`tab${tab === 'settings' ? ' active' : ''}`} onClick={() => setTab('settings')}>
          Settings
        </button>
      </div>

      {tab === 'requests' && (
        <Reveal>
          <div className="mgmt-section">
            {!requests ? (
              <div className="loading">
                <div className="loading-ticket">🎟️</div>
                <p>Pulling up the queue…</p>
              </div>
            ) : requests.length === 0 ? (
              <p className="mgmt-hint">No requests right now — the queue is clear.</p>
            ) : (
              <div className="mgmt-list">
                {requests.map((req) => (
                  <div key={req.id} className="mgmt-card">
                    <div className="mgmt-row">
                      <div className="mgmt-main mgmt-main-user">
                        <strong>
                          {req.username}
                          <span className={`mgmt-tag${req.status !== 'approved' ? ' mgmt-tag-off' : ''}`}>
                            {statusTag(req.status)}
                          </span>
                        </strong>
                        <span className="mgmt-sub">
                          {req.email}
                          {req.requestedAt ? ` · requested ${fmt(req.requestedAt)}` : ''}
                        </span>
                      </div>
                      {req.status === 'pending' && (
                        <div className="mgmt-side">
                          <button
                            type="button"
                            className="btn btn-small btn-ok"
                            disabled={busyId === req.id}
                            onClick={() => decide(req, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            disabled={busyId === req.id}
                            onClick={() => decide(req, 'deny')}
                          >
                            Deny
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'users' && (
        <Reveal>
          <div className="mgmt-section">
            {!users ? (
              <div className="loading">
                <div className="loading-ticket">🎩</div>
                <p>Rounding up the crew…</p>
              </div>
            ) : users.length === 0 ? (
              <p className="mgmt-hint">No members yet.</p>
            ) : (
              <div className="mgmt-list">
                {users.map((user) => {
                  const disabled = user.status === 'disabled';
                  return (
                    <div key={user.id} className="mgmt-card">
                      <div className="mgmt-row">
                        <Avatar avatar={user.avatar} name={user.displayName || user.username} size={40} />
                        <div className="mgmt-main mgmt-main-user">
                          <strong>
                            {user.displayName || user.username}
                            <span className="mgmt-user-handle">@{user.username}</span>
                          </strong>
                          <span className="mgmt-sub">{user.email || 'no email'}</span>
                        </div>
                        <span className={`mgmt-tag${disabled ? ' mgmt-tag-off' : ''}`}>
                          {user.role === 'owner' ? 'owner' : disabled ? 'disabled' : 'member'}
                        </span>
                        {user.role !== 'owner' && (
                          <div className="mgmt-side">
                            {disabled ? (
                              <button
                                type="button"
                                className="btn btn-small btn-ghost"
                                disabled={busyId === user.id}
                                onClick={() => userAction(user, 'enable', 'Re-enable')}
                              >
                                Re-enable
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-small btn-danger"
                                disabled={busyId === user.id}
                                onClick={() => userAction(user, 'disable', 'Disable')}
                              >
                                Disable
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-small btn-ghost"
                              disabled={busyId === user.id}
                              onClick={() => userAction(user, 'reset-password', 'Email a password reset to')}
                            >
                              Reset password
                            </button>
                            <button
                              type="button"
                              className="btn btn-small btn-ghost"
                              disabled={busyId === user.id}
                              onClick={() => setEditing({ id: user.id, username: user.username, displayName: user.displayName || '', email: user.email || '', password: '' })}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-small btn-danger"
                              disabled={busyId === user.id}
                              onClick={() => deleteUser(user)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mgmt-side mgmt-footer">
              <Link to="/guide" className="btn btn-small btn-ghost">
                Point members at the Guide →
              </Link>
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'settings' && (
        <Reveal>
          <div className="mgmt-section">
            <div className="mgmt-card mgmt-edit">
              <h3 className="mgmt-title">Member notifications</h3>
              <p className="mgmt-hint">
                Members can subscribe in the Guide to get pinged when new media or announcements arrive.
                Notifications go through the ntfy app (set NTFY_URL + NTFY_TOPIC on the server).
              </p>
              <div className="mgmt-side">
                <button type="button" className="btn btn-ghost" disabled={notify.busy} onClick={sendTestNotification}>
                  {notify.busy ? 'Sending…' : 'Send test notification'}
                </button>
                {notify.sent && <span className="owner-settings-ok">Sent — check your phone</span>}
                {notify.error && <span className="owner-settings-err">{notify.error}</span>}
              </div>
            </div>

            <div className="mgmt-card mgmt-edit">
              <h3 className="mgmt-title">Announcements</h3>
              <p className="mgmt-hint">
                Banner notices for the home page. Turning one on also pushes it out to members as a notification.
              </p>
              {saving && <p className="mgmt-sub">Saving…</p>}
              {settings?.announcements?.length ? (
                <div className="mgmt-list">
                  {settings.announcements.map((a) => (
                    <label key={a.id} className="mgmt-row mgmt-row-toggle">
                      <input
                        type="checkbox"
                        checked={!!a.enabled}
                        onChange={() => toggleAnnouncement(a)}
                        aria-label={`Enable announcement ${a.title}`}
                      />
                      <div className="mgmt-main">
                        <strong>{a.title}</strong>
                        {a.body && <span className="mgmt-sub">{a.body}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mgmt-hint">No announcements yet.</p>
              )}
            </div>
          </div>
        </Reveal>
      )}

      {editing && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`Edit ${editing.username}`} onClick={() => !busyId && setEditing(null)}>
          <div className="modal-card modal-card-narrow" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setEditing(null)} aria-label="Close">
              ✕
            </button>
            <div className="modal-info">
              <span className="modal-kicker">Member settings</span>
              <h2 className="modal-title">@{editing.username}</h2>
              <form className="mgmt-form mgmt-form-modal" onSubmit={saveEdit}>
                <label className="field">
                  <span className="field-label">Display name</span>
                  <input
                    type="text"
                    value={editing.displayName ?? ''}
                    onChange={(e) => setEditing({ ...editing, displayName: e.target.value })}
                    placeholder="Visible to members"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Email</span>
                  <input
                    type="email"
                    value={editing.email ?? ''}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">New password</span>
                  <input
                    type="password"
                    value={editing.password ?? ''}
                    onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                    placeholder="Leave blank to keep the current password"
                  />
                </label>
                <p className="field-hint">
                  The password is synced to Jellyfin and RomM. Leave it blank to only update the email.
                </p>
                <div className="mgmt-side mgmt-footer">
                  <button type="button" className="btn btn-ghost" disabled={busyId === editing.id} onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-gold" disabled={busyId === editing.id}>
                    {busyId === editing.id ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
