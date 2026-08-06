import { useEffect, useState } from 'react';
import { getRecentlyAdded, gameCoverUrl } from '../lib/api.js';
import Section from '../components/Section.jsx';
import PosterCard from '../components/PosterCard.jsx';

const rommUrl = 'https://romm.jewellcore.com';

export default function Games() {
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRecentlyAdded()
      .then((d) => setGames(d.games || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Game library</h1>
        <p className="page-sub">The latest arrivals in the arcade — pick one and play.</p>
      </div>

      {error && <div className="banner banner-error">Couldn't load games: {error}</div>}

      {!games && !error && (
        <div className="loading">
          <div className="loading-ticket">🎮</div>
          <p>Booting up the consoles…</p>
        </div>
      )}

      {games && (
        <Section
          title="Recently added"
          action={
            <a href={rommUrl} target="_blank" rel="noreferrer" className="btn btn-small btn-ghost">
              Open full library →
            </a>
          }
        >
          {games.length === 0 ? (
            <p className="muted">No games just yet — check back soon.</p>
          ) : (
            <div className="poster-grid">
              {games.map((g) => (
                <PosterCard
                  key={g.id}
                  image={gameCoverUrl(g.coverPath) || g.coverUrl || null}
                  title={g.name}
                  subtitle={g.platform}
                  badge="Play"
                  href={rommUrl}
                />
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
