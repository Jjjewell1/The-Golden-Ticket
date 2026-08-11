import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { TicketLogo } from './Ticket.jsx';
import ClockWidget from './ClockWidget.jsx';
import WeatherWidget from './WeatherWidget.jsx';
import Avatar from './Avatar.jsx';
import { useAuth } from '../lib/auth.jsx';
import { getSessions, getRequestCount, getStatus, posterUrl, movieHref } from '../lib/api.js';

const navLinks = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/movies', label: 'Movies', icon: '🎬' },
  { to: '/games', label: 'Games', icon: '🕹️' },
  { to: '/bookmarks', label: 'Bookmarks', icon: '📑' },
  { to: '/requests', label: 'Requests', icon: '🎟️' },
  { to: '/recently-added', label: 'Recently added', icon: '🆕' },
  { to: '/guide', label: 'Guide', icon: '🧭' },
  { to: '/profile', label: 'My profile', icon: '🎩' },
];

const SERVICE_LABELS = { jellyfin: 'Jellyfin', romm: 'RomM', seerr: 'Requests', linkwarden: 'Saved links' };

function useSidebarData() {
  const [state, setState] = useState({ sessions: [], requests: null, recentRequests: [], status: null });

  useEffect(() => {
    let alive = true;
    const load = () => {
      Promise.allSettled([getSessions(), getRequestCount(), getStatus()]).then(
        ([s, r, st]) => {
          if (!alive) return;
          setState({
            sessions: s.status === 'fulfilled' ? s.value : [],
            requests: r.status === 'fulfilled' ? r.value.count : null,
            recentRequests: r.status === 'fulfilled' ? r.value.requests || [] : [],
            status: st.status === 'fulfilled' ? st.value : null,
          });
        }
      );
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return state;
}

export default function Sidebar({ open, onClose }) {
  const { sessions, requests, recentRequests, status } = useSidebarData();
  const { user, logout } = useAuth();
  const services = ['jellyfin', 'romm', 'seerr', 'linkwarden'];
  const links = [
    ...navLinks,
    ...(user?.role === 'owner' ? [{ to: '/owner', label: 'Owner', icon: '🔑' }] : []),
  ];

  return (
    <>
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <TicketLogo size={38} />
          <span className="sidebar-brand-name">The Golden Ticket</span>
        </div>

        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-widgets">
          <ClockWidget />
          <WeatherWidget />

          <div className="sidebar-widget">
            <span className="sidebar-widget-title">🍿 On screen now</span>
            {sessions.length === 0 ? (
              <p className="sidebar-widget-empty">Popcorn&apos;s ready — nothing playing yet.</p>
            ) : (
              <div className="sidebar-sessions">
                {sessions.slice(0, 3).map((s, i) => (
                  <div key={i} className="sidebar-session">
                    {s.imageId ? (
                      <img
                        className="sidebar-session-thumb"
                        src={posterUrl(s.imageId, s.imageTag, 120)}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className="sidebar-session-dot" data-paused={s.paused} />
                    )}
                    <span className="sidebar-session-text">
                      <strong>{s.user}</strong>
                      <em>
                        {s.series || s.item}
                        {s.episode ? ` · S${s.season}E${s.episode}` : ''}
                      </em>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-widget">
            <span className="sidebar-widget-title">🎟️ Request queue</span>
            <div className="sidebar-queue">
              <span className="sidebar-queue-count">{requests ?? '…'}</span>
              <span className="sidebar-queue-label">
                {requests === 1 ? 'request downloading' : 'requests downloading'}
              </span>
            </div>
            {recentRequests.length > 0 && (
              <div className="sidebar-queue-list">
                {recentRequests.slice(0, 5).map((r) => {
                  const href = r.jellyfinId
                    ? movieHref(r.jellyfinId)
                    : r.tmdbId
                      ? `https://grab.jewellcore.com/${r.type === 'tv' ? 'tv' : 'movie'}/${encodeURIComponent(r.tmdbId)}`
                      : null;
                  const status = (
                    <span className="request-status" data-tone={r.status?.key}>
                      <span className="request-status-dot" />
                      {r.status?.label || 'Processing'}
                    </span>
                  );
                  return href ? (
                    <a
                      key={r.id}
                      className="sidebar-queue-item sidebar-queue-item-link"
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      title={r.title}
                    >
                      <span className="sidebar-queue-item-title">{r.title}</span>
                      {status}
                    </a>
                  ) : (
                    <div key={r.id} className="sidebar-queue-item" title={r.title}>
                      <span className="sidebar-queue-item-title">{r.title}</span>
                      {status}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="sidebar-widget">
            <span className="sidebar-widget-title">📡 All systems</span>
            {status ? (
              <div className="sidebar-status">
                {services.map((k) => (
                  <span key={k} className="sidebar-status-item">
                    <span className="sidebar-status-dot" data-on={!!status.services?.[k]} />
                    {SERVICE_LABELS[k]}
                  </span>
                ))}
              </div>
            ) : (
              <p className="sidebar-widget-empty">Checking…</p>
            )}
          </div>
        </div>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <Avatar avatar={user?.avatar} name={user?.displayName || user?.username} size={32} />
            <span className="sidebar-user-name">{user?.displayName || user?.username}</span>
            <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className={`sidebar-backdrop${open ? ' show' : ''}`} onClick={onClose} />
    </>
  );
}
