import { useState } from 'react';
import { Link } from 'react-router-dom';
import { postForgot } from '../lib/api.js';

export default function Forgot() {
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { ok, data } = await postForgot({ account: account.trim() });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Something went wrong. Try again.');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="page">
        <div className="auth-card">
          <div className="auth-card-icon" aria-hidden="true">✉️</div>
          <h1 className="page-title">Check your inbox</h1>
          <p className="page-sub">
            If that account exists, a password reset link is on its way. It expires in 15 minutes.
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
      <div className="auth-card">
        <div className="auth-card-icon" aria-hidden="true">🔑</div>
        <h1 className="page-title">Forgot your password?</h1>
        <p className="page-sub">Enter your username or email and we&apos;ll send you a reset link.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Field account={account} onChange={setAccount} />
          {error && <div className="banner banner-error">{error}</div>}
          <button type="submit" className="btn btn-gold btn-lg" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/">Back to sign in</Link>
          <Link to="/get-my-ticket">Get my ticket</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ account, onChange }) {
  return (
    <label className="field">
      <span className="field-label">Username or email</span>
      <input
        type="text"
        value={account}
        autoComplete="username"
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </label>
  );
}
