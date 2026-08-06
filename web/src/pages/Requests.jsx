import { useEffect, useState } from 'react';
import { getRequestCount } from '../lib/api.js';

const seerrUrl = 'https://grab.jewellcore.com';

export default function Requests() {
  const [count, setCount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRequestCount()
      .then((d) => setCount(d.count))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Media requests</h1>
        <p className="page-sub">
          Want something to watch? Request it — the owner will grab it as fast as possible.
        </p>
      </div>

      <div className="request-hero">
        <div className="request-hero-icon" aria-hidden="true">🎟️</div>
        <h2>See a movie you love? Wish a show existed here?</h2>
        <p>
          Search the catalog and hit request. It usually lands in Jellyfin within a day or two.
        </p>
        {error && <div className="banner banner-error">Couldn't check the queue: {error}</div>}
        {count !== null && (
          <p className="request-count">
            <span className="request-count-big">{count}</span> {count === 1 ? 'request is' : 'requests are'}{' '}
            in the queue right now.
          </p>
        )}
        <a href={seerrUrl} target="_blank" rel="noreferrer" className="btn btn-gold btn-lg">
          Go to requests
        </a>
      </div>
    </div>
  );
}
