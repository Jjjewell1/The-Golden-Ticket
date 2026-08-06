import { useEffect } from 'react';
import { posterUrl, gameCoverUrl } from '../lib/api.js';

const JELLYFIN_URL = 'https://movies.jewellcore.com';
const ROMM_URL = 'https://games.jewellcore.com';

function movieHref(m) {
  return `${JELLYFIN_URL}/web/index.html#/details?id=${encodeURIComponent(m.id)}`;
}

export default function DetailModal({ item, kind, onClose }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  if (!item) return null;

  const isMovie = kind === 'movie';
  const image = isMovie
    ? item.imageTag
      ? posterUrl(item.id, item.imageTag, 700)
      : null
    : gameCoverUrl(item.coverPath) || item.coverUrl || null;
  const meta = [isMovie ? item.year : item.platform, ...(item.genres || [])]
    .filter((x) => x !== undefined && x !== null && x !== '')
    .join(' · ');
  const overview = isMovie ? item.overview : item.summary;
  const href = isMovie ? movieHref(item) : ROMM_URL;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={item.name} onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="modal-poster">
          {image ? (
            <img src={image} alt={item.name} />
          ) : (
            <span className="modal-fallback" aria-hidden="true">
              {isMovie ? '🎬' : '🕹️'}
            </span>
          )}
        </div>
        <div className="modal-info">
          <span className="modal-kicker">{isMovie ? '🎬 Movie' : '🕹️ Game'}</span>
          <h2 className="modal-title">{item.name}</h2>
          {meta && <p className="modal-meta">{meta}</p>}
          {overview && <p className="modal-overview">{overview}</p>}
          <div className="modal-actions">
            <a href={href} target="_blank" rel="noreferrer" className="btn btn-gold" onClick={onClose}>
              {isMovie ? 'Watch on Jellyfin' : 'Play on RomM'}
            </a>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
