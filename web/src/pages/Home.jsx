import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConfig, getRecentlyAdded, getSessions, getRequestCount, posterUrl, gameCoverUrl } from '../lib/api.js';
import Section from '../components/Section.jsx';
import AppCard from '../components/AppCard.jsx';
import PosterCard from '../components/PosterCard.jsx';
import { TicketShape } from '../components/Ticket.jsx';

const jellyfinUrl = 'https://movies.jewellcore.com';

function useHomeData() {
  const [state, setState] = useState({ loading: true, config: null, data: null, sessions: [], requests: null, error: null });

  useEffect(() => {
    let alive = true;
    Promise.all([getConfig(), getRecentlyAdded(), getSessions(), getRequestCount()])
      .then(([config, data, sessions, requests]) => {
        if (!alive) return;
        setState({ loading: false, config, data, sessions, requests: requests.count, error: null });
      })
      .catch((err) => {
        if (!alive) return;
        setState({ loading: false, config: null, data: null, sessions: [], requests: null, error: err.message });
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

function WhoWatching({ sessions }) {
  if (sessions.length === 0) {
    return (
      <div className="watching watching-empty">
        <span className="watching-pop" aria-hidden="true">🍿</span>
        <p>
          <strong>Nobody's watching right now.</strong> The popcorn is ready when you are!
        </p>
      </div>
    );
  }
  return (
    <div className="watching">
      {sessions.map((s, i) => (
        <div key={i} className="watching-pill">
          <span className="watching-dot" title={s.paused ? 'paused' : 'watching now'} />
          <span>
            <strong>{s.user}</strong> is {s.paused ? 'paused' : 'watching'}{' '}
            <em>
              {s.series || s.item}
              {s.episode ? ` S${s.season}E${s.episode}` : ''}
            </em>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { loading, config, data, sessions, requests, error } = useHomeData();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-ticket">🎫</div>
        <p>Punching your ticket…</p>
      </div>
    );
  }

  const groups = config?.apps ? Array.from(new Set(config.apps.map((a) => a.group))) : [];
  const games = data?.games || [];

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">
          <span className="hero-badge">🎟️ You're invited</span>
          <h1 className="hero-title">
            <span>The</span> Golden <span className="hero-title-gold">Ticket</span>
          </h1>
          <p className="hero-tagline">
            Movies, games, and a little bit of magic — all in one place, just for you.
          </p>
          <div className="hero-cta">
            <Link to="/get-my-ticket" className="btn btn-gold">
              Get my ticket
            </Link>
            <a href={jellyfinUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
              Start watching
            </a>
          </div>
          <TicketShape className="hero-ticket">
            <p>Your all-access pass to the Jewellcore server.</p>
          </TicketShape>
        </div>
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
              <span className="announcement-mark" aria-hidden="true">📣</span>
              <div>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!error && <WhoWatching sessions={sessions} />}

      <Section title="Jump in" subtitle="Everything running on the server, one click away.">
        <div className="app-groups">
          {groups.map((group) => (
            <div key={group} className="app-group">
              <h3 className="app-group-title">{group}</h3>
              <div className="app-grid">
                {config.apps
                  .filter((a) => a.group === group)
                  .map((app) => (
                    <AppCard key={app.name} app={app} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {data && (data.movies?.length > 0 || data.series?.length > 0) && (
        <Section
          title="Fresh on Jellyfin"
          subtitle="The latest arrivals to the library."
          action={
            <a href={jellyfinUrl} target="_blank" rel="noreferrer" className="btn btn-small btn-ghost">
              Open Jellyfin →
            </a>
          }
        >
          {data.movies?.length > 0 && (
            <div className="poster-rail">
              {data.movies.map((m) => (
                <PosterCard
                  key={m.id}
                  image={m.imageTag ? posterUrl(m.id, m.imageTag) : null}
                  title={m.name}
                  subtitle={m.year ? `Movie · ${m.year}` : 'Movie'}
                  badge="New"
                  href={jellyfinUrl}
                />
              ))}
            </div>
          )}
          {data.series?.length > 0 && (
            <div className="poster-rail">
              {data.series.map((s) => (
                <PosterCard
                  key={s.id}
                  image={s.imageTag ? posterUrl(s.id, s.imageTag) : null}
                  title={s.name}
                  subtitle="Series"
                  badge="New"
                  href={jellyfinUrl}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {games.length > 0 && (
        <Section
          title="Fresh on RomM"
          subtitle="New games in the arcade."
          action={
            <Link to="/games" className="btn btn-small btn-ghost">
              All games →
            </Link>
          }
        >
          <div className="poster-rail">
            {games.slice(0, 10).map((g) => (
              <PosterCard
                key={g.id}
                image={gameCoverUrl(g.coverPath) || g.coverUrl || null}
                title={g.name}
                subtitle={g.platform}
                badge="Play"
                href="https://games.jewellcore.com"
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Want something new?" subtitle="Ask and you shall receive.">
        <div className="request-teaser">
          <div className="request-teaser-text">
            <h3>Found a movie or show you're dying to watch?</h3>
            <p>
              Send it through and it usually lands in the library within a day or two.
              {requests !== null && (
                <span className="request-count">
                  {' '}
                  {requests} {requests === 1 ? 'request' : 'requests'} in the queue right now.
                </span>
              )}
            </p>
          </div>
          <Link to="/requests" className="btn btn-gold">
            Request something
          </Link>
        </div>
      </Section>
    </div>
  );
}
