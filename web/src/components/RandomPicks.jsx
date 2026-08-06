import { useEffect, useState } from 'react';
import { getRandom, posterUrl, gameCoverUrl } from '../lib/api.js';
import { Reveal } from '../lib/useFx.jsx';

const jellyfinUrl = 'https://movies.jewellcore.com';
const rommUrl = 'https://games.jewellcore.com';

function movieHref(m) {
  return `${jellyfinUrl}/web/index.html#/details?id=${encodeURIComponent(m.id)}`;
}

function PickCard({ kind, item }) {
  const isMovie = kind === 'movie';
  if (!item) {
    return (
      <div className="random-card random-card-empty">
        <span className="random-empty-icon" aria-hidden="true">
          {isMovie ? '🎬' : '🕹️'}
        </span>
        <p className="muted">Nothing to roll here yet — the {isMovie ? 'shelf' : 'arcade'} is still filling up.</p>
      </div>
    );
  }
  const image = isMovie
    ? item.imageTag
      ? posterUrl(item.id, item.imageTag, 500)
      : null
    : gameCoverUrl(item.coverPath) || item.coverUrl || null;
  const meta = [isMovie ? item.year : item.platform, ...(item.genres || [])]
    .filter((x) => x !== undefined && x !== null && x !== '')
    .join(' · ');
  return (
    <div className="random-card">
      <div className="random-poster">
        {image ? <img src={image} alt={item.name} loading="lazy" /> : <div className="poster-fallback">🎬</div>}
      </div>
      <div className="random-info">
        <span className="random-tag">{isMovie ? '🎬 Random film' : '🕹️ Random game'}</span>
        <h3 className="random-title">{item.name}</h3>
        <p className="random-meta">{meta}</p>
        {(isMovie ? item.overview : item.summary) && (
          <p className="random-overview">{isMovie ? item.overview : item.summary}</p>
        )}
        <div className="random-actions">
          <a href={isMovie ? movieHref(item) : rommUrl} target="_blank" rel="noreferrer" className="btn btn-gold btn-small">
            {isMovie ? 'Watch now' : 'Play now'}
          </a>
          <span className="random-sub">{isMovie ? `${item.year || ''} · ${(item.genres || []).slice(0, 2).join(', ') || 'Movie'}` : `${item.platform}`}</span>
        </div>
      </div>
    </div>
  );
}

export default function RandomPicks() {
  const [picks, setPicks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getRandom()
      .then((d) => setPicks(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const anyItem = picks && (picks.movie || picks.game);

  return (
    <Reveal as="section" className="section" delay={60}>
      <div className="section-head">
        <div>
          <h2 className="section-title">Can't decide?</h2>
          <p className="section-sub">Roll the dice — tonight's pick is already queued up.</p>
        </div>
        <button type="button" className="btn btn-small btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'Rolling…' : '🔀 Shuffle'}
        </button>
      </div>

      {error && <div className="banner banner-error">Couldn't roll a pick: {error}</div>}

      {!loading && anyItem && (
        <div className="random-picks">
          <PickCard kind="movie" item={picks.movie} />
          <PickCard kind="game" item={picks.game} />
        </div>
      )}

      {loading && (
        <div className="random-picks random-picks-loading">
          <div className="loading-ticket">🎰</div>
          <p className="muted">Shuffling the deck…</p>
        </div>
      )}
    </Reveal>
  );
}
