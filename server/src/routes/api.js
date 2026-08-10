import { Router } from 'express';
import { createTtlCache } from '../cache.js';
import { config } from '../config.js';
import { requireAuth } from '../lib/session.js';
import { AVATAR_PALETTE } from '../lib/avatars.js';

export function apiRouter({ jellyfin, romm, seerr, linkwarden, store, secret, pushover, ntfy }) {
  const router = Router();
  const protectedRouter = Router();
  const cache = createTtlCache(config.cacheTtlMs);
  const auth = requireAuth({ store, secret });
  const protectedGet = (path, handler) => protectedRouter.get(path, auth, handler);

  router.get('/config', (req, res) => {
    const storedAnnouncements = store.getSetting('announcements', null);
    const announcements = Array.isArray(storedAnnouncements)
      ? storedAnnouncements.filter((a) => a && a.enabled)
      : config.announcements;
    res.json({
      publicUrl: config.publicUrl,
      signupEnabled: !!(config.ticketCode && jellyfin.apiKey && romm.adminUser && romm.adminPassword),
      approvalEnabled: !!pushover.enabled,
      apps: config.apps,
      ownerApps: config.ownerApps,
      announcements,
      banner: store.getSetting('banner', null),
      ownerPinSet: !!config.ownerPin,
      avatars: AVATAR_PALETTE,
      notify: ntfy?.enabled ? { subscribeUrl: ntfy.subscribeUrl } : null,
    });
  });

  router.get('/owner/verify', (req, res) => {
    const pin = String(req.query.pin || '');
    if (!config.ownerPin) return res.json({ ok: false });
    const ok = pin === config.ownerPin;
    res.json({ ok });
  });

  router.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  protectedGet('/recently-added', async (req, res) => {
    try {
      const type = String(req.query.type || 'all');
      const limit = Number(req.query.limit) || 0;
      const data = await cache.wrap(`recently-added:${type}:${limit}`, async () => {
        if (type === 'movie' || type === 'series') {
          const n = limit > 0 ? limit : 30;
          const items = await jellyfin.getRecentlyAdded(n, [type === 'movie' ? 'Movie' : 'Series']);
          return { type, items: items.map((i) => ({ ...i, kind: type })) };
        }
        if (type === 'game') {
          const n = limit > 0 ? limit : 30;
          const items = await romm.getRecentGames(n);
          return { type, items: items.map((g) => ({ ...g, kind: 'game' })) };
        }
        const [movies, series, games, links] = await Promise.allSettled([
          jellyfin.getRecentlyAdded(8, ['Movie']),
          jellyfin.getRecentlyAdded(4, ['Series']),
          romm.getRecentGames(10),
          linkwarden.getRecentLinks(10),
        ]);
        return {
          movies: movies.status === 'fulfilled' ? movies.value : [],
          series: series.status === 'fulfilled' ? series.value : [],
          games: games.status === 'fulfilled' ? games.value : [],
          links: links.status === 'fulfilled' ? links.value : [],
        };
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/sessions', async (req, res) => {
    try {
      const sessions = await cache.wrap('sessions', () => jellyfin.getSessions(), 15_000);
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/games', async (req, res) => {
    try {
      const games = await cache.wrap('games', () => romm.getFullGames(), 5 * 60_000);
      res.json({ items: games, total: games.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/movies', async (req, res) => {
    try {
      const movies = await cache.wrap('movies', () => jellyfin.getMovies(), 5 * 60_000);
      res.json({ items: movies, total: movies.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/movies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'missing id' });
      const detail = await cache.wrap(`movie-detail:${id}`, () => jellyfin.getMovieDetail(id), 5 * 60_000);
      if (!detail) return res.status(404).json({ error: 'not found' });
      res.json(detail);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/games/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'missing id' });
      const detail = await cache.wrap(`game-detail:${id}`, () => romm.getRomDetail(id), 5 * 60_000);
      if (!detail) return res.status(404).json({ error: 'not found' });
      res.json(detail);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/random', async (req, res) => {
    try {
      const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
      const type = String(req.query.type || 'both');
      const result = {};
      if (type === 'movie' || type === 'both') {
        const movies = await cache.wrap('movies', () => jellyfin.getMovies(), 5 * 60_000);
        result.movie = pick(movies);
      }
      if (type === 'game' || type === 'both') {
        const games = await cache.wrap('games', () => romm.getFullGames(), 5 * 60_000);
        result.game = pick(games);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/requests', async (req, res) => {
    try {
      const data = await cache.wrap('requests', () => seerr.getRequests(10), 60_000);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/links', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
      const key = q ? `links:search:${q}:${cursor ?? ''}` : `links:${cursor ?? ''}`;
      const data = await cache.wrap(key, () =>
        q ? linkwarden.searchLinks(q, { cursor }) : linkwarden.getLinks({ cursor }),
      );
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/img/lw', async (req, res) => {
    try {
      const id = req.query.id;
      if (!id) return res.status(400).send('missing id');
      const updatedAt = req.query.updatedAt || null;
      const image = await linkwarden.fetchArchive(id, { updatedAt });
      if (!image) return res.status(404).send('not found');
      res.set('Content-Type', image.contentType);
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(image.buffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/status', async (req, res) => {
    const results = await Promise.allSettled([
      jellyfin.getSessions(),
      romm.getRecentGames(1),
      seerr.getRequestCount(),
      linkwarden.getStatus(),
    ]);
    res.json({
      services: {
        jellyfin: results[0].status === 'fulfilled',
        romm: results[1].status === 'fulfilled',
        seerr: results[2].status === 'fulfilled',
        linkwarden: results[3].status === 'fulfilled',
      },
      checkedAt: new Date().toISOString(),
    });
  });

  protectedGet('/img/jf/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const tag = req.query.tag || null;
      const image = await jellyfin.fetchImage(id, tag, Number(req.query.maxWidth || 600));
      if (!image) return res.status(404).send('not found');
      res.set('Content-Type', image.contentType);
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(image.buffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  protectedGet('/img/romm', async (req, res) => {
    try {
      const path = req.query.path;
      if (!path) return res.status(400).send('missing path');
      const image = await romm.fetchAsset(path);
      if (!image) return res.status(404).send('not found');
      res.set('Content-Type', image.contentType);
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(image.buffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.use(protectedRouter);

  return router;
}
