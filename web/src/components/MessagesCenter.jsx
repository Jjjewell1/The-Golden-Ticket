import { useEffect, useState } from 'react';
import {
  getOwnerMessages,
  getOwnerNotifyStats,
  postOwnerMessage,
  postOwnerMessageTest,
  postOwnerMessageResend,
  deleteOwnerMessage,
} from '../lib/api.js';

const EMOJI_CHIPS = ['🎉', '📣', '🍿', '🎬', '🎮', '💌', '🎫', '✨'];
const LINK_CHIPS = [
  { label: 'Recently added', value: '/recently-added' },
  { label: 'Guide', value: '/guide' },
  { label: 'Requests', value: '/requests' },
  { label: 'Home', value: '/' },
];

const EMPTY = { title: '', body: '', link: '', image: '', postBanner: true };

function fmt(t) {
  return new Date(t).toLocaleDateString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusTag(m) {
  if (m.status === 'failed') return 'failed';
  return m.recipients > 0 ? `sent · ${m.recipients}` : 'no push';
}

export default function MessagesCenter() {
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.allSettled([getOwnerMessages(), getOwnerNotifyStats()]).then(([m, s]) => {
      if (!alive) return;
      if (m.status === 'fulfilled') setMessages(m.value.messages || []);
      if (s.status === 'fulfilled') setStats(s.value);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refresh = async () => {
    const [m, s] = await Promise.all([getOwnerMessages(), getOwnerNotifyStats()]);
    setMessages(m.messages || []);
    setStats(s);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleBanner = () => setForm((f) => ({ ...f, postBanner: !f.postBanner }));

  const charCount = form.body.length;
  const over180 = charCount > 180;

  const send = async (mode) => {
    setError('');
    setNotice('');
    if (!form.title.trim()) return setError('Give the message a title.');
    if (!form.body.trim()) return setError('Write a short message.');
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      link: form.link.trim() || null,
      image: form.image.trim() || null,
      postBanner: mode === 'family' ? form.postBanner : false,
    };
    setBusy(true);
    const res = mode === 'family' ? await postOwnerMessage(payload) : await postOwnerMessageTest(payload);
    setBusy(false);
    if (!res.ok) return setError(res.data.error || 'Could not send that message.');
    if (mode === 'family') {
      setForm(EMPTY);
      await refresh();
      const m = res.data.message || {};
      setNotice(m.note || (m.status === 'failed' ? 'The push did not go through — check the server logs.' : 'Message sent to the family.'));
    } else {
      setNotice('Test sent — check this device.');
    }
  };

  const resend = async (m) => {
    if (!window.confirm(`Send "${m.title}" to the family again?`)) return;
    setError('');
    setNotice('');
    setBusyId(m.id);
    const res = await postOwnerMessageResend(m.id);
    setBusyId(null);
    if (!res.ok) return setError(res.data.error || 'Could not resend that message.');
    await refresh();
    setNotice('Sent again.');
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete "${m.title}" from history?`)) return;
    setError('');
    setNotice('');
    setBusyId(m.id);
    const res = await deleteOwnerMessage(m.id);
    setBusyId(null);
    if (!res.ok) return setError(res.data.error || 'Could not delete that message.');
    setMessages((list) => list.filter((x) => x.id !== m.id));
  };

  const statsLine = stats
    ? `${stats.subscribedMembers} of ${stats.members} members subscribed · ${stats.devices} device${stats.devices === 1 ? '' : 's'}`
    : '…';

  return (
    <div className="msg-center">
      <div className="mgmt-card mgmt-edit">
        <h3 className="mgmt-title">Write a message</h3>
        <p className="mgmt-hint">
          Ping the whole family&apos;s phones, and optionally post a banner on the home page too.
        </p>
        {stats && (
          <div className="msg-stats">
            <span className="msg-stats-chip">{statsLine}</span>
            {stats.subscribers != null && (
              <span className="msg-stats-chip">{stats.subscribers} subscribed with OneSignal</span>
            )}
            {stats.channelConfigured === false && (
              <span className="owner-settings-err">Web push channel isn&apos;t saved in OneSignal yet.</span>
            )}
          </div>
        )}

        <form className="msg-composer" onSubmit={(e) => { e.preventDefault(); send('family'); }}>
          <label className="field">
            <span className="field-label">Title</span>
            <input type="text" value={form.title} onChange={set('title')} maxLength={80} placeholder="Movie night tonight? 🍿" />
          </label>

          <label className="field">
            <span className="field-label">
              Message{' '}
              <span className={`msg-count${over180 ? ' msg-count-warn' : ''}`}>
                {charCount}/300{over180 ? ' — may be cut short on phones' : ''}
              </span>
            </span>
            <textarea rows={3} value={form.body} onChange={set('body')} maxLength={300} placeholder="Friendly heads-up to the family…" />
          </label>

          <div className="emoji-chips" role="group" aria-label="Quick emoji">
            {EMOJI_CHIPS.map((e) => (
              <button key={e} type="button" className="chip" onClick={() => setForm((f) => ({ ...f, body: f.body + e }))}>
                {e}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field-label">Opens a link (optional)</span>
            <input type="text" value={form.link} onChange={set('link')} placeholder="/recently-added" />
            <span className="field-hint">
              <div className="link-chips">
                {LINK_CHIPS.map((c) => (
                  <button key={c.value} type="button" className="chip chip-link" onClick={() => setForm((f) => ({ ...f, link: c.value }))}>
                    {c.label}
                  </button>
                ))}
              </div>
            </span>
          </label>

          <label className="field">
            <span className="field-label">Big image (optional, http(s) URL)</span>
            <input type="text" value={form.image} onChange={set('image')} placeholder="https://…/poster.jpg" />
          </label>

          <label className="msg-banner-toggle">
            <input type="checkbox" checked={form.postBanner} onChange={toggleBanner} />
            <span>Also post as a home-page announcement</span>
          </label>

          {error && <div className="banner banner-error">{error}</div>}
          {notice && <div className="owner-settings-ok">{notice}</div>}

          <div className="mgmt-side">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => send('test')}>
              {busy ? 'Sending…' : 'Send a test to just me'}
            </button>
            <button type="submit" className="btn btn-gold" disabled={busy}>
              {busy ? 'Sending…' : 'Send to family'}
            </button>
          </div>
        </form>
      </div>

      <div className="mgmt-card mgmt-edit">
        <h3 className="mgmt-title">Preview</h3>
        <div className="msg-preview">
          <div className="notif-mock">
            <img className="notif-mock-icon" src="/onesignal-icon-192.png" alt="" />
            <div className="notif-mock-body">
              <strong>{form.title || 'Movie night tonight?'}</strong>
              <span>{form.body || 'Friendly heads-up to the family…'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mgmt-card mgmt-edit">
        <div className="msg-history-head">
          <h3 className="mgmt-title">Sent messages</h3>
          <span className="mgmt-sub">{messages ? messages.length : '…'}</span>
        </div>
        {messages === null ? (
          <p className="mgmt-hint">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="mgmt-hint">Nothing sent yet — the first message will land here.</p>
        ) : (
          <div className="mgmt-list">
            {messages.map((m) => (
              <div key={m.id} className="mgmt-card">
                <div className="mgmt-row">
                  <div className="mgmt-main">
                    <strong>
                      {m.title}
                      <span className={`mgmt-tag${m.status === 'failed' ? ' mgmt-tag-off' : ''}`}>{statusTag(m)}</span>
                    </strong>
                    <span className="mgmt-sub">
                      {fmt(m.sentAt)}
                      {m.postBanner ? ' · home banner' : ''}
                    </span>
                    {m.body && <span className="mgmt-sub">{m.body}</span>}
                    {m.note && <span className="owner-settings-err">{m.note}</span>}
                  </div>
                  <div className="mgmt-side">
                    <button type="button" className="btn btn-small btn-ghost" disabled={busyId === m.id} onClick={() => resend(m)}>
                      Re-send
                    </button>
                    <button type="button" className="btn btn-small btn-danger" disabled={busyId === m.id} onClick={() => remove(m)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
