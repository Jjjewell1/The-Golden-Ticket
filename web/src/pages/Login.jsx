import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

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
  const [form, setForm] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.username.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="auth-card">
        <div className="auth-card-icon" aria-hidden="true">🎫</div>
        <h1 className="page-title">The Golden Ticket</h1>
        <p className="page-sub">Sign in to your seat. Same username and password works everywhere.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Field label="Username" value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} autoComplete="username" />
          <Field label="Password" type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="current-password" />

          {error && <div className="banner banner-error">{error}</div>}

          <button type="submit" className="btn btn-gold btn-lg" disabled={busy}>
            {busy ? 'Checking your ticket…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot">Forgot your password?</Link>
          <Link to="/get-my-ticket">Get my ticket</Link>
        </div>
      </div>
    </div>
  );
}
