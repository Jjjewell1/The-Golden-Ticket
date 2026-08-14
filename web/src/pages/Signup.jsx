import { useState } from 'react';
import { Link } from 'react-router-dom';
import { postSignup } from '../lib/api.js';

const jellyfinUrl = 'https://movies.jewellcore.com';
const rommUrl = 'https://games.jewellcore.com';

function Field({ label, type = 'text', value, onChange, autoComplete, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', ticketCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    const { ok, data } = await postSignup({
      ticketCode: form.ticketCode,
      username: form.username,
      email: form.email,
      password: form.password,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Something went wrong. Try again.');
      return;
    }
    setResult(data);
  }

  if (result) {
    if (result.pending) {
      return (
        <div className="page">
          <div className="auth-card">
            <div className="auth-card-icon" aria-hidden="true">🕰️</div>
            <h1 className="page-title">Request in, {result.username}!</h1>
            <p className="page-sub">{result.message}</p>
            <div className="signup-success-note">
              Keep an eye on your inbox — we&apos;ll email you the moment the owner decides.
            </div>
            <p className="signup-success-note signup-notify-hint">
              Want a ping when new stuff lands? After you sign in, head to the <Link to="/guide">Guide</Link> and
              tap the 🔔 bell to turn on notifications.
            </p>
            <div className="auth-links">
              <Link to="/">Back to sign in</Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="page">
        <div className="signup-success">
          <div className="signup-success-ticket" aria-hidden="true">🎫</div>
          <h1 className="page-title">Welcome aboard, {result.username}!</h1>
          <p className="page-sub">{result.message}</p>

          {result.created.romm && result.created.jellyfin ? (
            <p className="signup-success-body">
              Your <strong>Jellyfin</strong> and <strong>RomM</strong> accounts are ready, and they both use the same
              username and password. Head in and start exploring:
            </p>
          ) : (
            <p className="signup-success-body">
              {result.created.jellyfin ? 'Jellyfin' : 'RomM'} is ready — the other one hit a snag, but the owner will sort
              it out. You can still get started:
            </p>
          )}

          <div className="signup-success-actions">
            {result.created.jellyfin && (
              <a href={jellyfinUrl} target="_blank" rel="noreferrer" className="btn btn-gold">
                Open Jellyfin
              </a>
            )}
            {result.created.romm && (
              <a href={rommUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
                Play games on RomM
              </a>
            )}
          </div>

          <p className="signup-success-note">
            Don&apos;t forget your password — we can&apos;t see it, so if you forget, use the sign-in page to reset it.
          </p>

          <p className="signup-success-note signup-notify-hint">
            Want a ping when new stuff lands? Head to the <Link to="/guide">Guide</Link> after signing in and tap
            the 🔔 bell to turn on notifications.
          </p>

          <div className="auth-links">
            <Link to="/">Sign in now</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Get my ticket</h1>
        <p className="page-sub">
          One sign-up gives you accounts for everything — Jellyfin (movies &amp; shows) and RomM (games).
        </p>
      </div>

      <form className="signup-form" onSubmit={handleSubmit}>
        <Field label="Username" value={form.username} onChange={set('username')} autoComplete="username" hint="2–32 characters. This is what you'll log in with." />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" hint="We'll only use this if you forget your password." />
        <Field label="Password" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" hint="At least 8 characters." />
        <Field label="Confirm password" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
        <Field label="Ticket code (optional)" value={form.ticketCode} onChange={set('ticketCode')} hint="Have the secret phrase from the owner? Enter it and you're in instantly. Otherwise we'll ping them for approval." />

        {error && <div className="banner banner-error">{error}</div>}

        <button type="submit" className="btn btn-gold btn-lg" disabled={busy}>
          {busy ? 'Punching your ticket…' : 'Create my accounts'}
        </button>
        <p className="signup-terms">
          You're on your honour to keep this server cosy — family and friends only. 🤝
        </p>
        <div className="auth-links">
          <Link to="/">Already have an account? Sign in</Link>
        </div>
      </form>
    </div>
  );
}
