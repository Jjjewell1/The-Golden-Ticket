export default function PosterCard({ image, title, subtitle, badge, href, onClick, emoji = '🎬' }) {
  const inner = (
    <>
      <div className="poster-img">
        {image ? (
          <img src={image} alt={title} loading="lazy" />
        ) : (
          <div className="poster-fallback" aria-hidden="true">
            {emoji}
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

  if (onClick) {
    return (
      <button type="button" className="poster-card poster-card-btn" onClick={onClick} aria-label={`View details for ${title}`}>
        {inner}
      </button>
    );
  }

  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="poster-card">
      {inner}
    </a>
  ) : (
    <div className="poster-card">{inner}</div>
  );
}
