export default function PosterCard({ image, title, subtitle, badge, href }) {
  const inner = (
    <>
      <div className="poster-img">
        {image ? (
          <img src={image} alt={title} loading="lazy" />
        ) : (
          <div className="poster-fallback" aria-hidden="true">
            🎬
          </div>
        )}
        {badge && <span className="poster-badge">{badge}</span>}
      </div>
      <div className="poster-meta">
        <span className="poster-title">{title}</span>
        {subtitle && <span className="poster-sub">{subtitle}</span>}
      </div>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="poster-card">
      {inner}
    </a>
  ) : (
    <div className="poster-card">{inner}</div>
  );
}
