import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { getAuthProfiles } from '../lib/api.js';
import Avatar from '../components/Avatar.jsx';

function Field({ label, type = 'text', value, onChange, autoComplete }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type={type} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} required />
    </label>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(null);
  const [selected, setSelected] = useState(null);
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAuthProfiles()
      .then((d) => setProfiles(d.profiles || []))
      .catch(() => setProfiles([]));
  }, []);

  async function submit(username, password) {
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const username = selected ? selected.username : form.username;
    submit(username, form.password);
  }

  const showGrid = !manual && profiles && profiles.length > 0 && !selected;

  return (
    <div className="page">
      {showGrid ? (
        <div className="auth-card auth-profiles">
          <div className="auth-card-icon" aria-hidden="true">🎫</div>
          <h1 className="page-title">Who&apos;s watching?</h1>
          <p className="page-sub">Pick your seat, then sign in with your password.</p>

          <div className="profile-grid">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                className="profile-card"
                onClick={() => {
                  setSelected(p);
                  setError('');
                }}
              >
                <span className="profile-card-avatar">
                  <Avatar avatar={p.avatar} name={p.displayName || p.username} size={84} />
                </span>
                <span className="profile-card-name">{p.displayName || p.username}</span>
              </button>
            ))}
          </div>

          <div className="auth-links">
            <button type="button" className="linklike" onClick={() => setManual(true)}>
              Use a different username
            </button>
            <Link to="/forgot">Forgot your password?</Link>
            <Link to="/get-my-ticket">Get my ticket</Link>
          </div>
        </div>
      ) : (
        <div className="auth-card">
          {selected && !manual ? (
            <div className="auth-profile-head">
              <span className="profile-card-avatar">
                <Avatar avatar={selected.avatar} name={selected.displayName || selected.username} size={64} />
              </span>
              <h1 className="page-title">{selected.displayName || selected.username}</h1>
            </div>
          ) : (
            <>
              <div className="auth-card-icon" aria-hidden="true">🎫</div>
              <h1 className="page-title">The Golden Ticket</h1>
              <p className="page-sub">Sign in to your seat. Same username and password works everywhere.</p>
            </>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {selected && !manual ? null : (
              <Field label="Username" value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} autoComplete="username" />
            )}
            <Field label="Password" type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="current-password" />

            {error && <div className="banner banner-error">{error}</div>}

            <button type="submit" className="btn btn-gold btn-lg" disabled={busy}>
              {busy ? 'Checking your ticket…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-links">
            {profiles && profiles.length > 0 && selected && !manual ? (
              <button
                type="button"
                className="linklike"
                onClick={() => {
                  setSelected(null);
                  setError('');
                }}
              >
                Back to profiles
              </button>
            ) : null}
            {!selected || manual ? (
              <button type="button" className="linklike" onClick={() => setManual(!manual)}>
                {manual ? 'Pick a profile instead' : 'Use a different username'}
              </button>
            ) : null}
            <Link to="/forgot">Forgot your password?</Link>
            <Link to="/get-my-ticket">Get my ticket</Link>
          </div>
        </div>
      )}
    </div>
  );
}
