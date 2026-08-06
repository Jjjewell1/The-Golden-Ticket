import { Router } from 'express';
import { createTtlCache } from '../cache.js';
import { config } from '../config.js';

export function apiRouter({ jellyfin, romm, seerr }) {
  const router = Router();
  const cache = createTtlCache(config.cacheTtlMs);

  router.get('/config', (req, res) => {
    res.json({
      publicUrl: config.publicUrl,
      signupEnabled: !!(config.ticketCode && jellyfin.apiKey && romm.adminUser && romm.adminPassword),
      apps: config.apps,
      ownerApps: config.ownerApps,
      announcements: config.announcements,
      ownerPinSet: !!config.ownerPin,
    });
  });

  router.get('/recently-added', async (req, res) => {
    try {
      const data = await cache.wrap('recently-added', async () => {
        const [movies, series, games] = await Promise.allSettled([
          jellyfin.getRecentlyAdded(8, ['Movie']),
          jellyfin.getRecentlyAdded(4, ['Series']),
          romm.getRecentGames(10),
        ]);
        return {
          movies: movies.status === 'fulfilled' ? movies.value : [],
          series: series.status === 'fulfilled' ? series.value : [],
          games: games.status === 'fulfilled' ? games.value : [],
        };
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/sessions', async (req, res) => {
    try {
      const sessions = await cache.wrap('sessions', () => jellyfin.getSessions(), 15_000);
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/requests', async (req, res) => {
    try {
      const count = await cache.wrap('requests', () => seerr.getRequestCount(), 60_000);
      res.json({ count });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/status', async (req, res) => {
    const results = await Promise.allSettled([
      jellyfin.getSessions(),
      romm.getRecentGames(1),
      seerr.getRequestCount(),
    ]);
    res.json({
      services: {
        jellyfin: results[0].status === 'fulfilled',
        romm: results[1].status === 'fulfilled',
        seerr: results[2].status === 'fulfilled',
      },
      checkedAt: new Date().toISOString(),
    });
  });

  router.get('/img/jf/:id', async (req, res) => {
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

  router.get('/img/romm', async (req, res) => {
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

  router.get('/owner/verify', (req, res) => {
    const pin = String(req.query.pin || '');
    if (!config.ownerPin) return res.json({ ok: false });
    const ok = pin === config.ownerPin;
    res.json({ ok });
  });

  router.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  return router;
}
