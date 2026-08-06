export class Jellyfin {
  constructor({ url, apiKey, userName = '' }) {
    this.url = url;
    this.apiKey = apiKey;
    this.userName = userName;
    this.detailUserId = null;
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

  mapItem(item) {
    return {
      id: item.Id,
      name: item.Name,
      type: item.Type,
      year: item.ProductionYear,
      overview: item.Overview,
      genres: item.Genres || [],
      createdAt: item.DateCreated,
      imageTag: item.ImageTags?.Primary || null,
    };
  }

  async getDetailUserId() {
    if (this.detailUserId) return this.detailUserId;
    const users = (await this.request('/Users')) || [];
    let match = null;
    if (this.userName) {
      match = users.find((u) => u.Name && u.Name.toLowerCase() === this.userName.toLowerCase());
    }
    if (!match) match = users[0];
    this.detailUserId = match ? match.Id : null;
    return this.detailUserId;
  }

  mapDetail(item) {
    const ms = (item.MediaStreams || []).find((s) => s.Type === 'Video');
    const as = (item.MediaStreams || []).find((s) => s.Type === 'Audio');
    const source = item.MediaSources && item.MediaSources[0];
    const cast = (item.People || [])
      .filter((p) => p.Type === 'Actor' && p.Name)
      .map((p) => ({ name: p.Name, role: p.Role || null }))
      .slice(0, 10);
    const directors = (item.People || [])
      .filter((p) => p.Type === 'Director' && p.Name)
      .map((p) => p.Name);
    return {
      id: item.Id,
      name: item.Name,
      year: item.ProductionYear,
      overview: item.Overview,
      genres: item.Genres || [],
      imageTag: item.ImageTags?.Primary || null,
      runtimeMinutes: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600_000_000) : null,
      communityRating: item.CommunityRating ?? null,
      criticRating: item.CriticRating ?? null,
      officialRating: item.OfficialRating || null,
      tagline: (item.Taglines && item.Taglines[0]) || null,
      premiereDate: item.PremiereDate || null,
      productionLocations: item.ProductionLocations || [],
      studios: (item.Studios || []).map((s) => s.Name),
      directors,
      cast,
      providerIds: item.ProviderIds || {},
      trailers: (item.RemoteTrailers || []).map((t) => t.Url).filter(Boolean),
      file: source
        ? {
            container: source.Container || null,
            size: source.Size ?? null,
            path: source.Path || null,
          }
        : null,
      video: ms ? { codec: ms.Codec, width: ms.Width, height: ms.Height, hdr: ms.VideoRange, bitDepth: ms.BitDepth } : null,
      audio: as ? { codec: as.Codec, channels: as.Channels } : null,
    };
  }

  async getMovieDetail(id) {
    const userId = await this.getDetailUserId();
    if (!userId) throw new Error('Jellyfin: no user available for detail lookup');
    const data = await this.request(`/Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(id)}`, {
      query: {
        Fields: 'People,Studios,MediaSources,MediaStreams,ProviderIds,RemoteTrailers,Taglines,OfficialRating,CriticRating,CommunityRating,RunTimeTicks,ProductionLocations,OriginalTitle,PremiereDate,Genres,Overview,ProductionYear',
      },
    });
    return this.mapDetail(data);
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
        Fields: 'PrimaryImageAspectRatio,DateCreated,Overview,ProductionYear,Genres',
      },
    });
    return (data.Items || []).map((item) => this.mapItem(item));
  }

  async getMovies() {
    const all = [];
    const pageSize = 100;
    let index = 0;
    let total = Infinity;
    while (index < total) {
      const data = await this.request('/Items', {
        query: {
          Recursive: true,
          SortBy: 'SortName',
          SortOrder: 'Ascending',
          Limit: pageSize,
          StartIndex: index,
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary',
          IncludeItemTypes: 'Movie',
          Fields: 'PrimaryImageAspectRatio,Overview,ProductionYear,Genres,SortName',
        },
      });
      const items = data.Items || [];
      for (const item of items) all.push(this.mapItem(item));
      total = data.TotalRecordCount ?? all.length;
      if (items.length === 0) break;
      index += items.length;
      if (index >= 20_000) break;
    }
    return all;
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
