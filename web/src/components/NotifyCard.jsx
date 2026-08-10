import { useEffect, useState } from 'react';
import { getConfig } from '../lib/api.js';

export default function NotifyCard() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let alive = true;
    getConfig()
      .then((c) => {
        if (alive) setConfig(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!config?.notify?.subscribeUrl) return null;

  return (
    <div className="notify-card">
      <div className="notify-card-icon" aria-hidden="true">
        🔔
      </div>
      <div className="notify-card-body">
        <h3>Get a ping when something new lands</h3>
        <p>
          Grab the free <strong>ntfy</strong> app and subscribe — you&apos;ll get a push
          whenever new movies, shows, or games hit the library.
        </p>
      </div>
      <a className="btn btn-gold" href={config.notify.subscribeUrl} target="_blank" rel="noreferrer">
        Subscribe
      </a>
    </div>
  );
}
