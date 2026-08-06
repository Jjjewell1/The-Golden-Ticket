import { useMemo, useState } from 'react';
import { getMovies, posterUrl } from '../lib/api.js';
import { useLibrary, useFilterGroups } from '../lib/useLibrary.js';
import PosterCard from '../components/PosterCard.jsx';
import FilterToolbar from '../components/FilterToolbar.jsx';
import DetailModal from '../components/DetailModal.jsx';
import { Reveal } from '../lib/useFx.jsx';

const jellyfinUrl = 'https://movies.jewellcore.com';

export default function Movies() {
  const { items, error } = useLibrary(getMovies);
  const [query, setQuery] = useState('');
  const [genreId, setGenreId] = useState('all');
  const [selected, setSelected] = useState(null);

  const genreGroups = useFilterGroups(items, (m) => m.genres || []);
  const chips = useMemo(
    () => [
      { id: 'all', label: 'All genres', count: items?.length || 0 },
      ...genreGroups.map(([label, count]) => ({ id: label, label, count })),
    ],
    [genreGroups, items],
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (genreId !== 'all' && !(m.genres || []).includes(genreId)) return false;
      if (!q) return true;
      return [m.name, m.year, ...(m.genres || [])].join(' ').toLowerCase().includes(q);
    });
  }, [items, query, genreId]);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Movie library</h1>
        <p className="page-sub">
          {items ? `${items.length} films, sorted from A to Z — find your next favourite.` : 'Every film in the collection, ready to watch.'}
        </p>
      </div>

      {error && <div className="banner banner-error">Couldn't load movies: {error}</div>}

      {!items && !error && (
        <div className="loading">
          <div className="loading-ticket">🎬</div>
          <p>Rolling the film reel…</p>
        </div>
      )}

      {items && (
        <>
          <Reveal>
            <FilterToolbar
              placeholder="Search movies, genres, years…"
              query={query}
              onQuery={setQuery}
              chips={chips}
              active={genreId}
              onSelect={setGenreId}
            />
          </Reveal>

          <div className="library-count">
            Showing {filtered.length} of {items.length} movies
            {genreId !== 'all' ? ` · ${genreId}` : ''}
          </div>

          <Reveal delay={60}>
            {filtered.length === 0 ? (
              <div className="library-empty">
                <span className="library-empty-icon" aria-hidden="true">
                  🎬
                </span>
                <p className="muted">No movies match that — try a different genre or search.</p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setQuery('');
                    setGenreId('all');
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="poster-grid">
                {filtered.map((m) => (
                  <PosterCard
                    key={m.id}
                    image={m.imageTag ? posterUrl(m.id, m.imageTag, 300) : null}
                    title={m.name}
                    subtitle={m.year ? String(m.year) : 'Movie'}
                    badge="Details"
                    onClick={() => setSelected(m)}
                  />
                ))}
              </div>
            )}
          </Reveal>

          <div className="library-foot">
            <a href={jellyfinUrl} target="_blank" rel="noreferrer" className="btn btn-small btn-ghost">
              Open full library in Jellyfin →
            </a>
          </div>
        </>
      )}

      <DetailModal item={selected} kind="movie" onClose={() => setSelected(null)} />
    </div>
  );
}
