import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getRecentlyAdded, posterUrl, gameCoverUrl } from '../lib/api.js';
import PosterCard from '../components/PosterCard.jsx';
import DetailModal from '../components/DetailModal.jsx';
import { Reveal } from '../lib/useFx.jsx';

const TABS = [
  { key: 'all', label: 'Everything' },
  { key: 'movie', label: 'Movies' },
  { key: 'series', label: 'Shows' },
  { key: 'game', label: 'Games' },
];

function tabFromSearch(search) {
  const type = new URLSearchParams(search).get('type');
  return TABS.some((t) => t.key === type) ? type : 'all';
}

export default function RecentlyAdded() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => tabFromSearch(location.search));
  const [state, setState] = useState({ loading: true, items: [], error: null });
  const [selected, setSelected] = useState(null);
  const [selectedKind, setSelectedKind] = useState('movie');

  useEffect(() => {
    setTab(tabFromSearch(location.search));
  }, [location.search]);

  const selectTab = (key) => {
    setTab(key);
    navigate(key === 'all' ? '/recently-added' : `/recently-added?type=${key}`, { replace: true });
  };

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    getRecentlyAdded(tab)
      .then((data) => {
        if (!alive) return;
        if (tab === 'all') {
          const items = [
            ...(data.movies || []).map((i) => ({ ...i, kind: 'movie' })),
            ...(data.series || []).map((i) => ({ ...i, kind: 'series' })),
            ...(data.games || []).map((i) => ({ ...i, kind: 'game' })),
          ];
          setState({ loading: false, items, error: null });
        } else {
          setState({ loading: false, items: data.items || [], error: null });
        }
      })
      .catch((err) => {
        if (alive) setState({ loading: false, items: [], error: err.message });
      });
    return () => {
      alive = false;
    };
  }, [tab]);

  const cardOf = (item) => {
    const isGame = item.kind === 'game';
    const label = isGame ? 'Game' : item.kind === 'series' ? 'Series' : 'Movie';
    return {
      image: isGame
        ? gameCoverUrl(item.coverPath) || item.coverUrl || null
        : item.imageTag
          ? posterUrl(item.id, item.imageTag, 300)
          : null,
      title: item.name,
      subtitle: isGame ? item.platform || label : `${label}${item.year ? ` · ${item.year}` : ''}`,
      badge: isGame ? 'Play' : 'New',
      emoji: isGame ? '🎮' : '🎬',
      onClick: () => {
        setSelected(item);
        setSelectedKind(isGame ? 'game' : 'movie');
      },
    };
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Recently added</h1>
        <p className="page-sub">The freshest movies, shows, and games in the library.</p>
      </div>

      <Reveal>
        <div className="filter-bar">
          <div className="filter-chips" role="tablist" aria-label="Filter recent additions">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`chip${tab === t.key ? ' active' : ''}`}
                onClick={() => selectTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {state.error && <div className="banner banner-error">Couldn&apos;t load the list: {state.error}</div>}

      {state.loading ? (
        <div className="loading">
          <div className="loading-ticket">✨</div>
          <p>Rounding up the newest arrivals…</p>
        </div>
      ) : state.items.length === 0 ? (
        <div className="library-empty">
          <span className="library-empty-icon" aria-hidden="true">
            📦
          </span>
          <p className="muted">Nothing new here yet — check back after the next haul.</p>
          <Link to="/" className="btn btn-ghost">
            Back home
          </Link>
        </div>
      ) : (
        <Reveal delay={60}>
          <div className="library-count">
            Showing {state.items.length} recent {state.items.length === 1 ? 'addition' : 'additions'}
          </div>
          <div className="poster-grid">
            {state.items.map((item) => (
              <PosterCard key={`${item.kind}-${item.id}`} {...cardOf(item)} />
            ))}
          </div>
        </Reveal>
      )}

      <DetailModal item={selected} kind={selectedKind} onClose={() => setSelected(null)} />
    </div>
  );
}
