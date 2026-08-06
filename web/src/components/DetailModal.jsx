import { useEffect, useState } from 'react';
import { posterUrl, gameCoverUrl, getMovieDetail, getGameDetail } from '../lib/api.js';

const JELLYFIN_URL = 'https://movies.jewellcore.com';
const ROMM_URL = 'https://games.jewellcore.com';

function movieHref(m) {
  return `${JELLYFIN_URL}/web/index.html#/details?id=${encodeURIComponent(m.id)}`;
}

function fmtMinutes(mins) {
  if (!mins && mins !== 0) return null;
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function fmtBytes(bytes) {
  if (!bytes && bytes !== 0) return null;
  const gb = bytes / 1073741824;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1048576;
  if (mb >= 1) return `${Math.round(mb)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function resLabel(v) {
  if (!v || !v.width) return null;
  const w = v.width;
  if (w >= 3840) return '4K';
  if (w >= 2560) return '1440p';
  if (w >= 1920) return '1080p';
  if (w >= 1280) return '720p';
  return `${v.width}×${v.height}`;
}

function youtubeIdFromUrl(url) {
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

export default function DetailModal({ item, kind, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!item) return;
    let alive = true;
    setDetail(null);
    setError(null);
    setLoading(true);
    (kind === 'movie' ? getMovieDetail(item.id) : getGameDetail(item.id))
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [item, kind]);

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
    ? (detail?.imageTag || item.imageTag)
      ? posterUrl(item.id, detail?.imageTag || item.imageTag, 700)
      : null
    : gameCoverUrl(detail?.coverPath || item.coverPath) || detail?.coverUrl || item.coverUrl || null;

  const movieYear = isMovie ? detail?.year || item.year : null;
  const genres = detail?.genres || item.genres || [];
  const meta = [isMovie ? movieYear : item.platform, ...genres]
    .filter((x) => x !== undefined && x !== null && x !== '')
    .join(' · ');
  const overview = detail?.overview || detail?.summary || item.overview || item.summary;
  const href = isMovie ? movieHref(item) : ROMM_URL;

  const stats = [];
  if (isMovie) {
    const rt = fmtMinutes(detail?.runtimeMinutes);
    if (rt) stats.push({ label: rt, icon: '⏱' });
    if (detail?.communityRating) stats.push({ label: `★ ${detail.communityRating.toFixed(1)}`, icon: null });
    if (detail?.officialRating) stats.push({ label: detail.officialRating, icon: '🔞', title: 'Content rating' });
    const res = resLabel(detail?.video);
    if (res) stats.push({ label: res, icon: '📺' });
    if (detail?.file?.container) stats.push({ label: detail.file.container.toUpperCase(), icon: '🎞️' });
  } else {
    if (detail?.year) stats.push({ label: String(detail.year), icon: '📅' });
    if (detail?.rating) stats.push({ label: `★ ${detail.rating.toFixed(0)}`, icon: null });
    const size = fmtBytes(detail?.fileSize);
    if (size) stats.push({ label: size, icon: '💾' });
    if (detail?.ageRatings?.length) stats.push({ label: detail.ageRatings[0], icon: '🔞' });
  }

  const trailerUrl = isMovie
    ? detail?.trailers?.length
      ? `https://www.youtube.com/watch?v=${youtubeIdFromUrl(detail.trailers[0])}`
      : null
    : detail?.youtubeVideoId
      ? `https://www.youtube.com/watch?v=${detail.youtubeVideoId}`
      : null;

  const imdbId = detail?.providerIds?.Imdb;
  const tmdbId = detail?.providerIds?.Tmdb;

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

          {stats.length > 0 && (
            <div className="modal-stats">
              {stats.map((s, i) => (
                <span className="modal-stat" key={i} title={s.title || undefined}>
                  {s.label}
                </span>
              ))}
            </div>
          )}

          {loading && (
            <div className="modal-skeleton" aria-hidden="true">
              <span className="skeleton-line w-80" />
              <span className="skeleton-line w-100" />
              <span className="skeleton-line w-60" />
            </div>
          )}

          {error && <p className="modal-error">Couldn't load extra details.</p>}

          {overview && <p className="modal-overview">{overview}</p>}

          {isMovie && detail && (
            <>
              {detail.directors.length > 0 && (
                <div className="modal-block">
                  <span className="modal-block-label">Directed by</span>
                  <div className="modal-chips">
                    {detail.directors.map((d) => (
                      <span className="modal-chip" key={d}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detail.cast.length > 0 && (
                <div className="modal-block">
                  <span className="modal-block-label">Cast</span>
                  <div className="modal-chips">
                    {detail.cast.map((c) => (
                      <span className="modal-chip" key={c.name}>
                        {c.name}
                        {c.role ? <em>{c.role}</em> : null}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detail.studios.length > 0 && (
                <p className="modal-note">
                  {detail.studios.join(' · ')}
                  {detail.tagline ? <em>{detail.tagline}</em> : null}
                </p>
              )}
            </>
          )}

          {detail && (
            <div className="modal-fileinfo">
              {isMovie ? (
                <>
                  {fmtBytes(detail.file?.size) && <span className="modal-fileinfo-item">{fmtBytes(detail.file.size)}</span>}
                  {detail.video && (
                    <span className="modal-fileinfo-item">
                      {detail.video.codec?.toUpperCase()} {resLabel(detail.video)}
                      {detail.video.hdr && detail.video.hdr !== 'SDR' ? ` · ${detail.video.hdr}` : ''}
                    </span>
                  )}
                  {detail.audio && <span className="modal-fileinfo-item">{detail.audio.codec?.toUpperCase()} {detail.audio.channels ? `${detail.audio.channels}ch` : ''}</span>}
                  {detail.productionLocations.length > 0 && <span className="modal-fileinfo-item">{detail.productionLocations.join(', ')}</span>}
                </>
              ) : (
                <>
                  {detail.companies.length > 0 && <span className="modal-fileinfo-item">{detail.companies.slice(0, 3).join(', ')}</span>}
                  {detail.collections.length > 0 && <span className="modal-fileinfo-item">{detail.collections.slice(0, 3).join(', ')}</span>}
                  {detail.regions.length > 0 && <span className="modal-fileinfo-item">{detail.regions.join(', ')}</span>}
                  {detail.languages.length > 0 && <span className="modal-fileinfo-item">{detail.languages.join(', ')}</span>}
                  {detail.files.length > 0 && <span className="modal-fileinfo-item">{detail.files.join(', ')}</span>}
                  {(detail.hasManual || detail.hasSoundtrack || detail.hasNotes) && (
                    <span className="modal-fileinfo-item">
                      {[detail.hasManual && 'Manual', detail.hasSoundtrack && 'Soundtrack', detail.hasNotes && 'Notes'].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <div className="modal-actions">
            {imdbId && (
              <a href={`https://www.imdb.com/title/${imdbId}/`} target="_blank" rel="noreferrer" className="btn btn-small btn-ghost">
                IMDb
              </a>
            )}
            {tmdbId && (
              <a href={`https://www.themoviedb.org/movie/${tmdbId}`} target="_blank" rel="noreferrer" className="btn btn-small btn-ghost">
                TMDb
              </a>
            )}
            {trailerUrl && (
              <a href={trailerUrl} target="_blank" rel="noreferrer" className="btn btn-small btn-ghost">
                ▶ Trailer
              </a>
            )}
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
