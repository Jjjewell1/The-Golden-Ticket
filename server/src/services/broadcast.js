// Polls Jellyfin + RomM for newly-added media and pings members via OneSignal.
// "Last seen" IDs are stored in the store settings so restarts don't re-notify,
// and the very first poll snapshots the library without notifying (avoids spam
// on a fresh deploy).

const LAST_SEEN_KEY = 'mediaLastSeen';
const POLL_INTERVAL_MS = 15 * 60 * 1000;
const TITLE_LIMIT = 5;

function ids(items) {
  return (items || []).map((i) => i.id);
}

function fmtList(items, limit = TITLE_LIMIT) {
  const names = items.slice(0, limit).map((i) => i.name).filter(Boolean);
  const extra = items.length - limit;
  return extra > 0 ? `${names.join(', ')} — and ${extra} more` : names.join(', ');
}

const KIND_LABEL = { movie: '🎬 Movies', series: '📺 Shows', game: '🕹️ Games' };

export function startBroadcaster({ onesignal, jellyfin, romm, store, publicUrl, intervalMs = POLL_INTERVAL_MS }) {
  if (!onesignal.enabled) {
    console.log('[broadcast] OneSignal not configured — new-media notifications disabled');
    return () => {};
  }

  let running = false;

  async function poll() {
    if (running) return;
    running = true;
    try {
      const [movies, series, games] = await Promise.allSettled([
        jellyfin.getRecentlyAdded(10, ['Movie']),
        jellyfin.getRecentlyAdded(5, ['Series']),
        romm.getRecentGames(10),
      ]);

      const lastSeen = store.getSetting(LAST_SEEN_KEY, null);
      if (!lastSeen) {
        store.setSetting(LAST_SEEN_KEY, {
          movie: ids(movies.status === 'fulfilled' ? movies.value : []),
          series: ids(series.status === 'fulfilled' ? series.value : []),
          game: ids(games.status === 'fulfilled' ? games.value : []),
          at: new Date().toISOString(),
        });
        console.log('[broadcast] first poll — snapshotted the library, no notifications sent');
        return;
      }

      const next = { ...lastSeen };
      const fresh = [];

      const check = (kind, result) => {
        if (result.status !== 'fulfilled') return;
        const items = result.value || [];
        const prev = new Set(lastSeen[kind] || []);
        const added = items.filter((i) => !prev.has(i.id));
        if (added.length) fresh.push({ kind, items: added });
        next[kind] = Array.from(new Set([...(lastSeen[kind] || []), ...ids(items)]));
      };

      check('movie', movies);
      check('series', series);
      check('game', games);

      if (fresh.length) {
        const lines = fresh.map(({ kind, items }) => `${KIND_LABEL[kind] || kind}: ${fmtList(items)}`);
        await onesignal.notify({
          headings: 'Fresh in the library ✨',
          contents: lines.join('\n'),
          url: publicUrl ? `${publicUrl}/recently-added` : null,
          subscriptionIds: store.activePlayerIds(),
        });
      }

      next.at = new Date().toISOString();
      store.setSetting(LAST_SEEN_KEY, next);
    } catch (err) {
      console.error('[broadcast] poll failed:', err.message);
    } finally {
      running = false;
    }
  }

  poll();
  const timer = setInterval(poll, intervalMs);
  return () => clearInterval(timer);
}
