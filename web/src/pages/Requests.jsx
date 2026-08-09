import { useEffect, useState } from 'react';
import { getRequests } from '../lib/api.js';

const seerrUrl = 'https://grab.jewellcore.com';

const TYPE_ICON = { movie: '🎬', tv: '📺', series: '📺' };

const posterUrl = (path) => (path ? `https://image.tmdb.org/t/p/w92${path}` : null);

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  const diff = Date.now() - date.getTime();
  const day = 86400000;
  if (diff >= 0 && diff < day) return 'today';
  if (diff >= 0 && diff < 2 * day) return 'yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Requests() {
  const [state, setState] = useState({ loading: true, error: null, count: null, requests: [] });

  useEffect(() => {
    let alive = true;
    getRequests()
      .then((d) => {
        if (!alive) return;
        setState({ loading: false, error: null, count: d.count, requests: d.requests || [] });
      })
      .catch((e) => {
        if (alive) setState({ loading: false, error: e.message, count: null, requests: [] });
      });
    return () => {
      alive = false;
    };
  }, []);

  const { loading, error, count, requests } = state;

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

      <section className="mgmt-section">
        <h2 className="mgmt-title">📦 Where things stand</h2>
        <p className="mgmt-hint">
          Track your request from &quot;awaiting approval&quot; all the way to &quot;ready to watch&quot;. The status
          refreshes every minute or so.
        </p>

        {error ? null : loading ? (
          <p className="sidebar-widget-empty">Checking the queue…</p>
        ) : requests.length === 0 ? (
          <p className="sidebar-widget-empty">
            No requests yet — go make the first one!
          </p>
        ) : (
          <div className="request-list">
            {requests.map((r) => (
              <div key={r.id} className="request-row">
                {r.posterPath ? (
                  <img
                    className="request-row-poster"
                    src={posterUrl(r.posterPath)}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="request-row-icon" aria-hidden="true">
                    {TYPE_ICON[r.type] || '🎬'}
                  </div>
                )}
                <div className="request-row-main">
                  <strong className="request-row-title">
                    {r.title}
                    {r.year ? <span className="request-row-year">{r.year}</span> : null}
                  </strong>
                  <span className="request-row-meta">
                    {r.requestedBy}
                    {r.requestedAt ? ` · requested ${fmtDate(r.requestedAt)}` : ''}
                    {r.is4k ? ' · 4K' : ''}
                  </span>
                </div>
                <span className="request-status" data-tone={r.status?.key}>
                  <span className="request-status-dot" />
                  {r.status?.label || 'Processing'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
