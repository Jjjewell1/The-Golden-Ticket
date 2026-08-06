import { useTilt } from '../lib/useFx.jsx';

export default function Spotlight({ item, href, cta = 'Watch now' }) {
  const tilt = useTilt(5);
  return (
    <div className="spotlight">
      <div className="spotlight-backdrop" aria-hidden="true">
        {item.image && <img src={item.image} alt="" />}
      </div>
      <div className="spotlight-inner">
        <div className="spotlight-poster" {...tilt}>
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
        </div>
        <div className="spotlight-info">
          <span className="spotlight-kicker">Fresh in the library</span>
          <h3 className="spotlight-title">{item.title}</h3>
          {item.year && <span className="spotlight-year">{item.year}</span>}
          {item.overview && <p className="spotlight-overview">{item.overview}</p>}
          <a href={href} target="_blank" rel="noreferrer" className="btn btn-gold btn-lg">
            {cta}
          </a>
        </div>
      </div>
    </div>
  );
}
