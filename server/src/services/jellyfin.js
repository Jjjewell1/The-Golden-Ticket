export class Jellyfin {
  constructor({ url, apiKey }) {
    this.url = url;
    this.apiKey = apiKey;
  }

  async request(path, { method = 'GET', body, query = {} } = {}) {
    const url = new URL(`${this.url}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
    const headers = {};
    if (this.apiKey) headers.Authorization = `MediaBrowser Token="${this.apiKey}"`;
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Jellyfin ${method} ${path} failed: ${res.status} ${text.slice(0, 200)}`);
    }

    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res;
  }

  async getRecentlyAdded(limit = 12, types = ['Movie', 'Series']) {
    const data = await this.request('/Items', {
      query: {
        Recursive: true,
        SortBy: 'DateCreated',
        SortOrder: 'Descending',
        Limit: limit,
        ImageTypeLimit: 1,
        EnableImageTypes: 'Primary',
        IncludeItemTypes: types.join(','),
        Fields: 'PrimaryImageAspectRatio,DateCreated,Overview,ProductionYear',
      },
    });
    return (data.Items || []).map((item) => ({
      id: item.Id,
      name: item.Name,
      type: item.Type,
      year: item.ProductionYear,
      overview: item.Overview,
      createdAt: item.DateCreated,
      imageTag: item.ImageTags?.Primary || null,
    }));
  }

  async getSessions() {
    const sessions = await this.request('/Sessions', {
      query: { ActiveWithinSeconds: 3600 },
    });
    return sessions
      .filter((s) => s.NowPlayingItem && s.UserName)
      .map((s) => ({
        user: s.UserName,
        item: s.NowPlayingItem?.Name,
        type: s.NowPlayingItem?.Type,
        series: s.NowPlayingItem?.SeriesName,
        season: s.NowPlayingItem?.ParentIndexNumber,
        episode: s.NowPlayingItem?.IndexNumber,
        year: s.NowPlayingItem?.ProductionYear,
        paused: !!s.PlayState?.IsPaused,
        playMethod: s.PlayState?.PlayMethod,
        client: s.Client,
        deviceName: s.DeviceName,
        imageId: s.NowPlayingItem?.Id || null,
        imageTag: s.NowPlayingItem?.ImageTags?.Primary || null,
        transcode: s.TranscodingInfo ? { video: s.TranscodingInfo.VideoCodec, audio: s.TranscodingInfo.AudioCodec } : null,
      }));
  }

  async createUser(username, password) {
    const user = await this.request('/Users/New', {
      method: 'POST',
      body: { Name: username },
    });
    if (user?.Id) {
      await this.request(`/Users/${user.Id}/Password`, {
        method: 'POST',
        body: { NewPw: password },
      });
    }
    return { id: user?.Id, name: user?.Name };
  }

  async findUser(username) {
    const users = await this.request('/Users');
    const match = (users || []).find(
      (u) => u.Name && u.Name.toLowerCase() === String(username).toLowerCase(),
    );
    return match ? { id: match.Id, name: match.Name } : null;
  }

  async fetchImage(itemId, imageTag, maxWidth = 600) {
    const url = new URL(`${this.url}/Items/${encodeURIComponent(itemId)}/Images/Primary`);
    url.searchParams.set('maxWidth', String(maxWidth));
    url.searchParams.set('quality', '90');
    if (imageTag) url.searchParams.set('tag', imageTag);
    const res = await fetch(url.toString(), {
      headers: this.apiKey ? { Authorization: `MediaBrowser Token="${this.apiKey}"` } : {},
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      buffer: buf,
      contentType: res.headers.get('content-type') || 'image/jpeg',
    };
  }
}
