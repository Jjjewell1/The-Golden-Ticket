export default function AppCard({ app }) {
  return (
    <a
      href={app.url}
      target="_blank"
      rel="noreferrer"
      className="app-card"
      style={{ '--accent': app.accent || '#d4af37' }}
    >
      <div className="app-card-icon">
        <span>{app.icon}</span>
      </div>
      <div className="app-card-info">
        <h3 className="app-card-name">{app.name}</h3>
        <p className="app-card-tagline">{app.tagline}</p>
      </div>
      <span className="app-card-arrow" aria-hidden="true">
        →
      </span>
    </a>
  );
}
