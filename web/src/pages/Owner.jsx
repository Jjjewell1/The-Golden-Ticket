import { useEffect, useState } from 'react';
import { getConfig, verifyOwnerPin } from '../lib/api.js';
import AppCard from '../components/AppCard.jsx';

export default function Owner() {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('gt_owner') === '1');
  const [error, setError] = useState('');
  const [ownerApps, setOwnerApps] = useState([]);

  useEffect(() => {
    getConfig().then((c) => setOwnerApps(c.ownerApps || [])).catch(() => {});
  }, []);

  async function handleUnlock(e) {
    e.preventDefault();
    setError('');
    const ok = await verifyOwnerPin(pin);
    if (ok) {
      sessionStorage.setItem('gt_owner', '1');
      setUnlocked(true);
    } else {
      setError('That PIN is not right.');
    }
  }

  if (!unlocked) {
    return (
      <div className="page">
        <div className="owner-gate">
          <div className="owner-gate-icon" aria-hidden="true">🔒</div>
          <h1 className="page-title">Owner's only</h1>
          <p className="page-sub">This section is for the keeper of the server. Enter the PIN to continue.</p>
          <form className="owner-form" onSubmit={handleUnlock}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              autoFocus
            />
            {error && <div className="banner banner-error">{error}</div>}
            <button type="submit" className="btn btn-gold">
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Owner's corner</h1>
        <p className="page-sub">The behind-the-scenes tools that keep the lights on.</p>
      </div>
      <div className="app-grid owner-grid">
        {ownerApps.map((app) => (
          <AppCard key={app.name} app={app} />
        ))}
      </div>
    </div>
  );
}
