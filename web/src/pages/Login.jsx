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
  const { login, loginPin } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(null);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
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

  async function signInProfile(profile, pinValue) {
    setError('');
    setBusy(true);
    try {
      await loginPin(profile.id, pinValue || '');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleProfileTap(p) {
    setError('');
    if (p.hasPin) {
      setSelected(p);
      setPin('');
      setManual(false);
    } else {
      signInProfile(p, '');
    }
  }

  function handlePinSubmit(e) {
    if (e) e.preventDefault();
    if (!selected || pin.length !== 4 || busy) return;
    signInProfile(selected, pin);
  }

  function handlePinChange(v) {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    setPin(digits);
    if (digits.length === 4 && !busy) signInProfile(selected, digits);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    submit(form.username, form.password);
  }

  function backToGrid() {
    setSelected(null);
    setPin('');
    setError('');
  }

  const showGrid = !manual && profiles && profiles.length > 0 && !selected;

  return (
    <div className="page">
      {showGrid ? (
        <div className="auth-card auth-profiles">
          <div className="auth-card-icon" aria-hidden="true">🎫</div>
          <h1 className="page-title">Who&apos;s watching?</h1>
          <p className="page-sub">Pick your seat. Enter your PIN if you have one.</p>

          <div className="profile-grid">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                className="profile-card"
                disabled={busy}
                onClick={() => handleProfileTap(p)}
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
      ) : selected && !manual ? (
        <div className="auth-card">
          <div className="auth-profile-head">
            <span className="profile-card-avatar">
              <Avatar avatar={selected.avatar} name={selected.displayName || selected.username} size={64} />
            </span>
            <h1 className="page-title">{selected.displayName || selected.username}</h1>
          </div>

          <form className="auth-form" onSubmit={handlePinSubmit}>
            <label className="field pin-field-wrap">
              <span className="field-label">Enter your 4-digit PIN</span>
              <input
                type="password"
                className="pin-field"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                autoFocus
                disabled={busy}
              />
            </label>

            {error && <div className="banner banner-error">{error}</div>}

            <button type="submit" className="btn btn-gold btn-lg" disabled={busy || pin.length !== 4}>
              {busy ? 'Checking your ticket…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-links">
            <button type="button" className="linklike" onClick={backToGrid}>
              Back to profiles
            </button>
            <button type="button" className="linklike" onClick={() => setManual(true)}>
              Use a different username
            </button>
            <Link to="/forgot">Forgot your password?</Link>
            <Link to="/get-my-ticket">Get my ticket</Link>
          </div>
        </div>
      ) : (
        <div className="auth-card">
          {selected && !manual ? null : (
            <>
              <div className="auth-card-icon" aria-hidden="true">🎫</div>
              <h1 className="page-title">The Golden Ticket</h1>
              <p className="page-sub">Sign in to your seat. Same username and password works everywhere.</p>
            </>
          )}

          <form className="auth-form" onSubmit={handleManualSubmit}>
            {!selected || manual ? (
              <Field label="Username" value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} autoComplete="username" />
            ) : null}
            <Field label="Password" type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="current-password" />

            {error && <div className="banner banner-error">{error}</div>}

            <button type="submit" className="btn btn-gold btn-lg" disabled={busy}>
              {busy ? 'Checking your ticket…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-links">
            {profiles && profiles.length > 0 ? (
              <button type="button" className="linklike" onClick={() => { setManual(false); backToGrid(); }}>
                {selected ? 'Back to profiles' : 'Pick a profile instead'}
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
