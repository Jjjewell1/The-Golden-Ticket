import { Router } from 'express';
import { config } from '../config.js';
import { renderShareCard } from '../og/render.js';
import { createTtlCache } from '../cache.js';

let pngCache = null;
let pngCacheKey = '';

export function ogRouter({ jellyfin, romm }) {
  const router = Router();
  const dataCache = createTtlCache(120_000);

  async function loadImages() {
    const [movies, series, games] = await Promise.allSettled([
      jellyfin.getRecentlyAdded(6, ['Movie']),
      jellyfin.getRecentlyAdded(2, ['Series']),
      romm.getRecentGames(6),
    ]);
    const movieList = movies.status === 'fulfilled' ? movies.value : [];
    const seriesList = series.status === 'fulfilled' ? series.value : [];
    const gamesList = games.status === 'fulfilled' ? games.value : [];

    const media = [...movieList, ...seriesList];

    const posters = [];
    for (const item of media.slice(0, 5)) {
      if (!item.imageTag) {
        posters.push(null);
        continue;
      }
      const img = await jellyfin.fetchImage(item.id, item.imageTag, 300).catch(() => null);
      posters.push(img ? toDataUri(img) : null);
    }

    const gameCovers = [];
    for (const game of gamesList.slice(0, 4)) {
      let uri = null;
      if (game.coverPath) {
        const img = await romm.fetchAsset(game.coverPath).catch(() => null);
        uri = img ? toDataUri(img) : null;
      }
      if (!uri && game.coverUrl) {
        const img = await romm.fetchRemoteImage(game.coverUrl).catch(() => null);
        uri = img ? toDataUri(img) : null;
      }
      gameCovers.push(uri);
    }

    return { posters, gameCovers };
  }

  router.get('/og-image.png', async (req, res) => {
    try {
      const cacheKey = `${config.publicUrl}`;
      if (!pngCache || pngCacheKey !== cacheKey) {
        const { posters, gameCovers } = await dataCache.wrap('og-data', loadImages);
        pngCache = await renderShareCard({
          posters,
          games: gameCovers,
          url: config.publicUrl,
        });
        pngCacheKey = cacheKey;
      }
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=3600');
      res.set('Content-Length', pngCache.length);
      res.send(pngCache);
    } catch (err) {
      console.error('OG render failed:', err);
      res.status(500).json({ error: 'og render failed' });
    }
  });

  return router;
}

function toDataUri(img) {
  return `data:${img.contentType};base64,${img.buffer.toString('base64')}`;
}
