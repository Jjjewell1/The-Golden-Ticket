import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getConfig,
  getRecentlyAdded,
  getSessions,
  getRequestCount,
  getStatus,
  posterUrl,
  gameCoverUrl,
  linkPreviewUrl,
} from '../lib/api.js';
import AppCard from '../components/AppCard.jsx';
import PosterRail from '../components/PosterRail.jsx';
import Spotlight from '../components/Spotlight.jsx';
import RandomPicks from '../components/RandomPicks.jsx';
import DetailModal from '../components/DetailModal.jsx';
import { useAuth } from '../lib/auth.jsx';
import { Reveal, useCountUp, useTilt } from '../lib/useFx.jsx';

const jellyfinUrl = 'https://movies.jewellcore.com';
const rommUrl = 'https://games.jewellcore.com';
const linkwardenUrl = 'https://link.jewellcore.com';

function hostOf(url) {
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function useHomeData() {
  const [state, setState] = useState({
    loading: true,
    config: null,
    data: null,
    sessions: [],
    requests: null,
    status: null,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    Promise.all([getConfig(), getRecentlyAdded(), getSessions(), getRequestCount(), getStatus()])
      .then(([config, data, sessions, requests, status]) => {
        if (!alive) return;
        setState({ loading: false, config, data, sessions, requests: requests.count, status, error: null });
      })
      .catch((err) => {
        if (!alive) return;
        setState({ loading: false, config: null, data: null, sessions: [], requests: null, status: null, error: err.message });
      });
    const t = setInterval(async () => {
      try {
        const s = await getSessions();
        if (alive) setState((prev) => ({ ...prev, sessions: s }));
      } catch {
        /* keep last */
      }
    }, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return state;
}

const tickerWords = ['Movies', 'Games', 'Requests', 'Photos', 'Files', 'Favorites'];

function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {[0, 1].map((half) => (
          <span className="ticker-half" key={half}>
            {tickerWords.map((word, i) => (
              <span className="ticker-item" key={i}>
                <span className="ticker-star">✦</span> {word}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  const n = useCountUp(value);
  return (
    <div className="stat">
      <span className="stat-num">{n}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function LiveNow({ sessions }) {
  if (sessions.length === 0) {
    return (
      <div className="livenow livenow-empty">
        <span className="livenow-emoji" aria-hidden="true">
          🍿
        </span>
        <p>
          <strong>The popcorn is ready when you are.</strong>
        </p>
      </div>
    );
  }
  return (
    <div className="livenow">
      <span className="livenow-label">
        <span className="live-dot" /> Live
      </span>
      <div className="livenow-track">
        {sessions.map((s, i) => (
          <span className="livenow-item" key={i}>
            {s.imageId ? (
              <img
                className="livenow-thumb"
                src={posterUrl(s.imageId, s.imageTag)}
                alt=""
                loading="lazy"
              />
            ) : (
              <span className="livenow-dot" data-paused={s.paused} />
            )}
            <span className="livenow-text">
              <strong>{s.user}</strong> {s.paused ? 'paused' : 'is watching'}{' '}
              <em>
                {s.series || s.item}
                {s.episode ? ` · S${s.season}E${s.episode}` : ''}
              </em>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { loading, config, data, sessions, requests, status, error } = useHomeData();
  const ticketTilt = useTilt(7);
  const [selected, setSelected] = useState(null);
  const [selectedKind, setSelectedKind] = useState('movie');

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-ticket">🎫</div>
        <p>Punching your ticket…</p>
      </div>
    );
  }

  const movies = data?.movies || [];
  const series = data?.series || [];
  const games = data?.games || [];
  const featured = movies[0] || null;

  const statusFor = (name) => {
    const map = { Jellyfin: 'jellyfin', RomM: 'romm', 'Media Requests': 'seerr', Linkwarden: 'linkwarden' };
    const key = map[name];
    if (!key || !status) return null;
    return status.services?.[key] ?? null;
  };

  const openDetail = (kind, item) => {
    setSelectedKind(kind);
    setSelected(item);
  };

  const movieRail = movies.slice(1).map((m) => ({
    id: m.id,
    image: m.imageTag ? posterUrl(m.id, m.imageTag) : null,
    title: m.name,
    subtitle: m.year ? `Movie · ${m.year}` : 'Movie',
    badge: 'New',
    overlay: m.overview,
    href: jellyfinUrl,
    raw: m,
  }));

  const seriesRail = series.map((s) => ({
    id: s.id,
    image: s.imageTag ? posterUrl(s.id, s.imageTag) : null,
    title: s.name,
    subtitle: 'Series',
    badge: 'New',
    overlay: s.overview,
    href: jellyfinUrl,
    raw: s,
  }));

  const gameRail = games.slice(0, 10).map((g) => ({
    id: g.id,
    image: gameCoverUrl(g.coverPath) || g.coverUrl || null,
    title: g.name,
    subtitle: g.platform,
    badge: 'Play',
    emoji: '🎮',
    href: rommUrl,
    raw: g,
  }));

  const linkRail = (data?.links || []).slice(0, 12).map((l) => ({
    id: l.id,
    image: linkPreviewUrl(l),
    title: l.name || l.url,
    subtitle: hostOf(l.url) || l.collection?.name || 'Saved link',
    badge: l.collection?.name || 'Saved',
    emoji: l.icon || '📑',
    href: l.url || linkwardenUrl,
    raw: l,
  }));

  const openRail = (kind) => (it) => openDetail(kind, it.raw || it);

  const customBanner = config?.banner?.image || null;
  const tagline = config?.banner?.tagline || 'Movies, games, and a little bit of magic — all in one place, just for you.';

  return (
    <div className="home">
      <section className={`hero${customBanner ? ' hero-banner' : ''}`}>
        {customBanner && (
          <>
            <img className="hero-banner-img" src={customBanner} alt="" />
            <span className="hero-banner-scrim" aria-hidden="true" />
          </>
        )}
        <div className="hero-inner">
          <span className="hero-badge hero-anim" style={{ '--d': '0ms' }}>
            <span className="live-dot" /> Your all-access pass has arrived
          </span>

          <h1 className="hero-title hero-anim" style={{ '--d': '120ms' }}>
            <span className="hero-title-line">
              <span className="hero-title-the">The</span>
            </span>
            <span className="hero-title-line shimmer">Golden Ticket</span>
          </h1>

          <p className="hero-tagline hero-anim" style={{ '--d': '240ms' }}>
            {tagline}
          </p>

          <div className="hero-cta hero-anim" style={{ '--d': '360ms' }}>
            {!user && (
              <Link to="/get-my-ticket" className="btn btn-gold btn-lg">
                <span className="btn-label">Get my ticket</span>
                <span className="btn-shine" aria-hidden="true" />
              </Link>
            )}
            <a href={jellyfinUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">
              Start watching
            </a>
          </div>

          {!customBanner && (
            <div className="hero-floaters" aria-hidden="true">
              <span className="hero-floater" style={{ '--fx': '-7%', '--fy': '6%', '--fd': '0s' }}>
                🍿
              </span>
              <span className="hero-floater" style={{ '--fx': '94%', '--fy': '2%', '--fd': '-1.2s' }}>
                🎬
              </span>
              <span className="hero-floater" style={{ '--fx': '97%', '--fy': '68%', '--fd': '-2s' }}>
                🕹️
              </span>
              <span className="hero-floater" style={{ '--fx': '-5%', '--fy': '74%', '--fd': '-0.6s' }}>
                🎮
              </span>
            </div>
          )}

          <div className="hero-stats hero-anim" style={{ '--d': '480ms' }}>
            <Stat value={movies.length} label="Movies in" />
            <Stat value={series.length} label="Shows in" />
            <Stat value={games.length} label="Games in" />
            <Stat value={requests ?? 0} label="In the queue" />
          </div>

          {!customBanner && (
            <div className="hero-ticket hero-anim" style={{ '--d': '600ms' }}>
              <div className="hero-ticket-tilt" {...ticketTilt}>
                <div className="ticket-shape">
                  <div className="ticket-notch ticket-notch-l" />
                  <div className="ticket-body">
                    <p>Your all-access pass to the Jewellcore server.</p>
                  </div>
                  <div className="ticket-notch ticket-notch-r" />
                </div>
              </div>
            </div>
          )}
        </div>

        <Ticker />
      </section>

      {error && (
        <div className="banner banner-error">
          Having trouble reaching the server: {error}
        </div>
      )}

      {config?.announcements?.length > 0 && (
        <div className="announcements">
          {config.announcements.map((a, i) => (
            <div key={i} className="announcement">
              <span className="announcement-mark" aria-hidden="true">
                📣
              </span>
              <div>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!error && (
        <Reveal>
          <LiveNow sessions={sessions} />
        </Reveal>
      )}

      {config?.apps?.length > 0 && (
        <Reveal as="section" className="section" delay={80}>
          <div className="section-head">
            <div>
              <h2 className="section-title">Everything, one click away</h2>
              <p className="section-sub">Your own corner of the internet — all of it, right here.</p>
            </div>
          </div>
          <div className="app-grid">
            {config.apps.map((app, i) => (
              <AppCard key={app.name} app={app} online={statusFor(app.name)} />
            ))}
          </div>
        </Reveal>
      )}

      <RandomPicks onSelect={openDetail} />

      {featured && (
        <Reveal as="section" className="section" delay={60}>
          <div className="section-head">
            <div>
              <h2 className="section-title">Fresh on Jellyfin</h2>
              <p className="section-sub">The latest arrivals to the library.</p>
            </div>
            <Link to="/movies" className="btn btn-small btn-ghost">
              All movies →
            </Link>
          </div>
          <Spotlight
            item={{ image: featured.imageTag ? posterUrl(featured.id, featured.imageTag, 600) : null, title: featured.name, year: featured.year, overview: featured.overview }}
            href={jellyfinUrl}
            onSelect={() => openDetail('movie', featured)}
          />
        </Reveal>
      )}

      {movieRail.length > 0 && (
        <Reveal delay={80}>
          <PosterRail items={movieRail} size="tall" auto={4200} className="rail-inset" onSelect={openRail('movie')} />
        </Reveal>
      )}

      {seriesRail.length > 0 && (
        <Reveal as="section" className="section" delay={80}>
          <div className="section-head">
            <div>
              <h3 className="section-kicker">New series</h3>
              <h2 className="section-title">Fresh shows</h2>
            </div>
          </div>
          <PosterRail items={seriesRail} size="tall" onSelect={openRail('movie')} />
        </Reveal>
      )}

      {gameRail.length > 0 && (
        <Reveal as="section" className="section" delay={80}>
          <div className="section-head">
            <div>
              <h2 className="section-title">Fresh on RomM</h2>
              <p className="section-sub">New games in the arcade.</p>
            </div>
            <Link to="/games" className="btn btn-small btn-ghost">
              All games →
            </Link>
          </div>
          <PosterRail items={gameRail} size="wide" onSelect={openRail('game')} />
        </Reveal>
      )}

      {linkRail.length > 0 && (
        <Reveal as="section" className="section" delay={80}>
          <div className="section-head">
            <div>
              <h2 className="section-title">Saved links</h2>
              <p className="section-sub">Bookmarks you tucked away, ready when you are.</p>
            </div>
            <Link to="/bookmarks" className="btn btn-small btn-ghost">
              All bookmarks →
            </Link>
          </div>
          <PosterRail items={linkRail} size="wide" />
        </Reveal>
      )}

      <Reveal as="section" className="section">
        <div className="request-banner">
          <span className="request-banner-orb" aria-hidden="true" />
          <div className="request-banner-icon" aria-hidden="true">
            🎟️
          </div>
          <div className="request-banner-text">
            <h2>Found something you're dying to watch?</h2>
            <p>
              Send it through and it usually lands in the library within a day or two.
              {requests !== null && (
                <span className="request-count">
                  {' '}
                  <strong className="request-count-big">{requests}</strong>{' '}
                  {requests === 1 ? 'request' : 'requests'} in the queue right now.
                </span>
              )}
            </p>
          </div>
          <Link to="/requests" className="btn btn-gold btn-lg">
            Request something
          </Link>
        </div>
      </Reveal>

      <DetailModal item={selected} kind={selectedKind} onClose={() => setSelected(null)} />
    </div>
  );
}
