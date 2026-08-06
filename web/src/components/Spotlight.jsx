import { useTilt } from '../lib/useFx.jsx';

export default function Spotlight({ item, href, cta = 'Watch now', onSelect }) {
  const tilt = useTilt(5);
  const clickable = Boolean(onSelect);
  const open = () => onSelect && onSelect();

  const poster = (
    <>
      {item.image ? (
        <img src={item.image} alt={item.title} />
      ) : (
        <span className="spotlight-fallback" aria-hidden="true">
          🎬
        </span>
      )}
      <span className="spotlight-badge">
        <span className="live-dot" /> Now showing
      </span>
    </>
  );

  return (
    <div className={`spotlight${clickable ? ' spotlight-clickable' : ''}`}>
      <div className="spotlight-backdrop" aria-hidden="true">
        {item.image && <img src={item.image} alt="" />}
      </div>
      <div className="spotlight-inner">
        {clickable ? (
          <button type="button" className="spotlight-poster" {...tilt} onClick={open} aria-label={`View details for ${item.title}`}>
            {poster}
          </button>
        ) : (
          <div className="spotlight-poster" {...tilt}>
            {poster}
          </div>
        )}
        <div className="spotlight-info">
          <span className="spotlight-kicker">Fresh in the library</span>
          {clickable ? (
            <button type="button" className="spotlight-title spotlight-title-btn" onClick={open}>
              {item.title}
            </button>
          ) : (
            <h3 className="spotlight-title">{item.title}</h3>
          )}
          {item.year && <span className="spotlight-year">{item.year}</span>}
          {item.overview && <p className="spotlight-overview">{item.overview}</p>}
          {clickable ? (
            <button type="button" className="btn btn-gold btn-lg" onClick={open}>
              View details
            </button>
          ) : (
            <a href={href} target="_blank" rel="noreferrer" className="btn btn-gold btn-lg">
              {cta}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
