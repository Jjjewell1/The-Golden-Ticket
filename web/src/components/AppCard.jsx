import { useTilt } from '../lib/useFx.jsx';

export default function AppCard({ app, online }) {
  const tilt = useTilt(9);
  const status =
    online === null
      ? { label: 'Checking', tone: 'unknown' }
      : online
        ? { label: 'Online', tone: 'online' }
        : { label: 'Offline', tone: 'offline' };

  return (
    <a
      {...tilt}
      href={app.url}
      target="_blank"
      rel="noreferrer"
      className="app-card"
      style={{ '--accent': app.accent || '#d4af37' }}
    >
      <span className="app-card-glow" aria-hidden="true" />
      <span className="app-card-top">
        <span className="app-card-icon">
          <span>{app.icon}</span>
        </span>
        <span className="app-card-status" data-tone={status.tone} title={status.label}>
          <span className="app-card-status-dot" />
          {status.label}
        </span>
      </span>
      <span className="app-card-body">
        <span className="app-card-group">{app.group}</span>
        <span className="app-card-name">{app.name}</span>
        <span className="app-card-tagline">{app.tagline}</span>
      </span>
      <span className="app-card-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17L17 7M9 7h8v8" />
        </svg>
      </span>
    </a>
  );
}
