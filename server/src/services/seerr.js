export class Seerr {
  constructor({ url, apiKey }) {
    this.url = url;
    this.apiKey = apiKey;
  }

  async request(path, query = {}) {
    const url = new URL(`${this.url}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { 'X-Api-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`Seerr ${path} failed: ${res.status}`);
    return res.json();
  }

  async getRequestCount() {
    const data = await this.request('/api/v1/request', { take: 1, skip: 0 });
    return data?.pageInfo?.results ?? 0;
  }

  async getRequests(take = 15, skip = 0) {
    const data = await this.request('/api/v1/request', { take, skip });
    const count = data?.pageInfo?.results ?? 0;
    const results = data?.results || [];

    const requests = await Promise.all(
      results.map(async (r) => {
        const media = r.media || {};
        const is4k = !!r.is4k;
        const mediaStatus = is4k && media.status4k ? media.status4k : media.status;

        // Jellyseerr keeps no metadata on the media record, so resolve the
        // title/year/poster through its TMDB proxy when we have a TMDB id.
        let title = media.title || null;
        let year = null;
        let posterPath = null;
        if (title === null && media.tmdbId) {
          try {
            const mediaType = media.mediaType || (r.type === 'tv' ? 'tv' : 'movie');
            const detail = await this.request(`/api/v1/${mediaType}/${encodeURIComponent(media.tmdbId)}`);
            title = detail?.title || detail?.name || null;
            year = (detail?.releaseDate || detail?.firstAirDate || '').slice(0, 4) || null;
            posterPath = detail?.posterPath || null;
          } catch {
            // Title stays null and the UI falls back to a generic label.
          }
        }

        return {
          id: r.id,
          type: r.type || (media.mediaType === 'tv' ? 'tv' : 'movie'),
          title: title || 'Unknown title',
          year,
          is4k,
          posterPath,
          requestedBy:
            r.requestedBy?.displayName ||
            r.requestedBy?.jellyfinUsername ||
            r.requestedBy?.username ||
            r.requestedBy?.email ||
            'Someone',
          requestedAt: r.createdAt || null,
          updatedAt: r.updatedAt || null,
          seasonCount: r.seasonCount ?? (Array.isArray(r.seasons) ? r.seasons.length : 0),
          status: deriveStatus(r.status, mediaStatus),
        };
      }),
    );

    return { count, requests };
  }

  async getStatus() {
    const data = await this.request('/api/v1/status');
    return {
      version: data.version,
      appTitle: data.appName || 'Seerr',
      url: this.url,
    };
  }
}

// Jellyseerr request statuses: 1 = PENDING, 2 = APPROVED, 3 = DECLINED, 4 = FAILED, 5 = COMPLETED.
// Media statuses: 1 = UNKNOWN, 2 = PENDING, 3 = PROCESSING, 4 = PARTIALLY_AVAILABLE, 5 = AVAILABLE.
function deriveStatus(requestStatus, mediaStatus) {
  if (mediaStatus === 5) return { key: 'available', label: 'Ready to watch' };
  if (mediaStatus === 4) return { key: 'partial', label: 'Partially available' };
  if (requestStatus === 3) return { key: 'declined', label: 'Declined' };
  if (requestStatus === 4) return { key: 'failed', label: 'Failed' };
  if (requestStatus === 2) {
    return mediaStatus === 3
      ? { key: 'downloading', label: 'Downloading' }
      : { key: 'approved', label: 'Approved' };
  }
  return { key: 'pending', label: 'Awaiting approval' };
}
