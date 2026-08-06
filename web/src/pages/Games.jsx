import { useMemo, useState } from 'react';
import { getGames, gameCoverUrl } from '../lib/api.js';
import { useLibrary, useFilterGroups } from '../lib/useLibrary.js';
import PosterCard from '../components/PosterCard.jsx';
import FilterToolbar from '../components/FilterToolbar.jsx';
import DetailModal from '../components/DetailModal.jsx';
import { Reveal } from '../lib/useFx.jsx';

const rommUrl = 'https://games.jewellcore.com';

export default function Games() {
  const { items, error } = useLibrary(getGames);
  const [query, setQuery] = useState('');
  const [consoleId, setConsoleId] = useState('all');
  const [selected, setSelected] = useState(null);

  const consoleGroups = useFilterGroups(items, (g) => [g.platform]);
  const chips = useMemo(
    () => [
      { id: 'all', label: 'All consoles', count: items?.length || 0 },
      ...consoleGroups.map(([label, count]) => ({ id: label, label, count })),
    ],
    [consoleGroups, items],
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items.filter((g) => {
      if (consoleId !== 'all' && g.platform !== consoleId) return false;
      if (!q) return true;
      return [g.name, g.platform, ...(g.genres || [])]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, consoleId]);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Game library</h1>
        <p className="page-sub">
          {items ? `${items.length} games across ${consoleGroups.length} consoles — pick one and play.` : 'Every console, every cartridge, one arcade.'}
        </p>
      </div>

      {error && <div className="banner banner-error">Couldn't load games: {error}</div>}

      {!items && !error && (
        <div className="loading">
          <div className="loading-ticket">🎮</div>
          <p>Booting up the consoles…</p>
        </div>
      )}

      {items && (
        <>
          <Reveal>
            <FilterToolbar
              placeholder="Search games, consoles, genres…"
              query={query}
              onQuery={setQuery}
              chips={chips}
              active={consoleId}
              onSelect={setConsoleId}
            />
          </Reveal>

          <div className="library-count">
            Showing {filtered.length} of {items.length} games
            {consoleId !== 'all' ? ` · ${consoleId}` : ''}
          </div>

          <Reveal delay={60}>
            {filtered.length === 0 ? (
              <div className="library-empty">
                <span className="library-empty-icon" aria-hidden="true">
                  🕹️
                </span>
                <p className="muted">No games match that — try a different console or search.</p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setQuery('');
                    setConsoleId('all');
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="poster-grid">
                {filtered.map((g) => (
                  <PosterCard
                    key={g.id}
                    image={gameCoverUrl(g.coverPath) || g.coverUrl || null}
                    title={g.name}
                    subtitle={g.platform}
                    badge="Details"
                    emoji="🕹️"
                    onClick={() => setSelected(g)}
                  />
                ))}
              </div>
            )}
          </Reveal>

          <div className="library-foot">
            <a href={rommUrl} target="_blank" rel="noreferrer" className="btn btn-small btn-ghost">
              Open full library in RomM →
            </a>
          </div>
        </>
      )}

      <DetailModal item={selected} kind="game" onClose={() => setSelected(null)} />
    </div>
  );
}
