import { fetchWithTimeout } from '../lib/http.js';

export class Romm {
  constructor({ url, adminUser, adminPassword }) {
    this.url = url;
    this.adminUser = adminUser;
    this.adminPassword = adminPassword;
    this.cookies = new Map();
    this.sessionExpiresAt = 0;
  }

  cookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  absorbCookies(res) {
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (setCookies.length) {
      for (const raw of setCookies) {
        const [pair] = raw.split(';');
        const eq = pair.indexOf('=');
        if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    }
  }

  async request(path, { method = 'GET', body, auth = false, csrf = false } = {}) {
    const url = new URL(`${this.url}${path}`);
    const headers = { Accept: 'application/json' };
    if (this.cookies.size) headers.Cookie = this.cookieHeader();
    if (csrf) {
      const token = this.cookies.get('romm_csrftoken') || '';
      if (token) headers['X-CSRFToken'] = token;
    }
    if (auth) {
      const cred = Buffer.from(`${this.adminUser}:${this.adminPassword}`).toString('base64');
      headers.Authorization = `Basic ${cred}`;
    }
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetchWithTimeout(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    this.absorbCookies(res);
    return res;
  }

  async ensureSession() {
    if (this.sessionExpiresAt > Date.now()) return;

    await this.request('/api/docs');
    if (!this.cookies.get('romm_csrftoken')) {
      throw new Error('RomM: could not obtain CSRF token');
    }

    const login = await this.request('/api/login', {
      method: 'POST',
      auth: true,
      csrf: true,
    });
    if (login.status !== 200 || !this.cookies.get('romm_session')) {
      throw new Error(`RomM: login failed (${login.status}). Check ROMM_ADMIN_USER/PASSWORD.`);
    }

    this.sessionExpiresAt = Date.now() + 60 * 60 * 1000;
  }

  mapRom(g) {
    const genres = (g.metadatum?.genres || [])
      .map((x) => (typeof x === 'string' ? x : x?.name))
      .filter(Boolean)
      .slice(0, 4);
    return {
      id: g.id,
      name: g.name || g.fs_name_no_tags,
      platform: g.platform_display_name,
      platformSlug: g.platform_slug,
      slug: g.slug,
      coverPath: g.path_cover_large || null,
      coverUrl: g.url_cover || null,
      summary: g.summary || null,
      identified: !!g.is_identified,
      updatedAt: g.updated_at,
      genres,
    };
  }

  mapRomDetail(g) {
    const m = g.metadatum || {};
    const ageRatings = (m.age_ratings || [])
      .map((r) => {
        if (typeof r === 'string') return r;
        const system = r.category === 1 ? 'ESRB' : r.category === 2 ? 'PEGI' : null;
        const value = r.rating || r.name;
        if (!value) return null;
        return system ? `${system} ${value}` : String(value);
      })
      .filter(Boolean);
    const files = (g.files || []).map((f) => f.file_name).filter(Boolean);
    return {
      ...this.mapRom(g),
      year: m.first_release_date ? new Date(m.first_release_date).getFullYear() : null,
      rating: m.average_rating ?? null,
      companies: (m.companies || []).filter(Boolean),
      collections: (m.collections || []).filter(Boolean),
      franchises: (m.franchises || []).filter(Boolean),
      ageRatings,
      gameModes: (m.game_modes || []).filter(Boolean),
      playerCount: m.player_count || null,
      regions: g.regions || [],
      languages: g.languages || [],
      tags: g.tags || [],
      fileSize: g.fs_size_bytes ?? null,
      hasManual: !!g.has_manual,
      hasSoundtrack: !!g.has_soundtrack,
      hasNotes: !!g.has_notes,
      youtubeVideoId: g.youtube_video_id || null,
      files,
    };
  }

  async getRomDetail(id) {
    await this.ensureSession();
    const res = await this.request(`/api/roms/${encodeURIComponent(id)}`);
    if (res.status === 401) {
      this.sessionExpiresAt = 0;
      await this.ensureSession();
      return this.getRomDetail(id);
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`RomM: get rom detail failed ${res.status}`);
    const g = await res.json();
    return this.mapRomDetail(g);
  }

  async _fetchRoms(query = {}) {
    await this.ensureSession();
    const params = new URLSearchParams();
    const merged = { ...query };
    // RomM needs an explicit platform_ids filter — without it every rom is
    // reported under the first platform (e.g. all games show as "Game Boy").
    if (merged.platform_ids == null) {
      merged.platform_ids = await this.getPlatformIds();
    }
    if (Array.isArray(merged.platform_ids) && merged.platform_ids.length === 0) {
      return { items: [], total: 0 };
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) {
        for (const item of v) params.append(k, String(item));
      } else {
        params.set(k, String(v));
      }
    }
    const res = await this.request(`/api/roms?${params.toString()}`);
    if (res.status === 401) {
      this.sessionExpiresAt = 0;
      await this.ensureSession();
      return this._fetchRoms(query);
    }
    if (!res.ok) throw new Error(`RomM: getRoms failed ${res.status}`);
    const data = await res.json();
    return {
      items: (data.items || []).map((g) => this.mapRom(g)),
      total: data.total || 0,
    };
  }

  async getPlatformIds() {
    await this.ensureSession();
    const res = await this.request('/api/platforms');
    if (res.status === 401) {
      this.sessionExpiresAt = 0;
      await this.ensureSession();
      return this.getPlatformIds();
    }
    if (!res.ok) throw new Error(`RomM: get platforms failed ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.platforms || data.items || [];
    return list
      .map((p) => p.id)
      .filter((id) => typeof id === 'number' && id > 0);
  }

  async getRecentGames(limit = 12) {
    const platformIds = await this.getPlatformIds();
    const { items } = await this._fetchRoms({
      limit,
      order_by: 'updated_at',
      order_dir: 'desc',
      with_files: 'false',
      platform_ids: platformIds,
    });
    return items;
  }

  async getFullGames() {
    const all = [];
    const platformIds = await this.getPlatformIds();
    const pageSize = 200;
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const { items, total: t } = await this._fetchRoms({
        limit: pageSize,
        offset,
        order_by: 'name_sort_key',
        order_dir: 'asc',
        with_files: 'false',
        platform_ids: platformIds,
      });
      all.push(...items);
      total = t || all.length;
      if (items.length === 0) break;
      offset += items.length;
      if (offset >= 10_000) break;
    }
    return all;
  }

  async findUser(username) {
    await this.ensureSession();
    const res = await this.request('/api/users');
    if (!res.ok) throw new Error(`RomM: get users failed ${res.status}`);
    const users = await res.json();
    const match = (users || []).find(
      (u) => u.username && u.username.toLowerCase() === String(username).toLowerCase(),
    );
    return match ? { id: match.id, username: match.username, role: match.role } : null;
  }

  async createUser(username, email, password) {
    await this.ensureSession();
    const res = await this.request('/api/users', {
      method: 'POST',
      csrf: true,
      body: { username, email, password, role: 'user' },
    });
    if (res.status === 401) {
      this.sessionExpiresAt = 0;
      await this.ensureSession();
      return this.createUser(username, email, password);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`RomM: create user failed ${res.status} ${detail.slice(0, 300)}`);
    }
    return res.json();
  }

  async ensureUserPassword(username, email, password) {
    const existing = await this.findUser(username);
    if (existing) {
      const attempt = async (method) =>
        this.request(`/api/users/${existing.id}`, {
          method,
          csrf: true,
          body: { password, email },
        });
      let res = await attempt('PUT');
      if (res.status === 405) res = await attempt('PATCH');
      if (res.status === 401) {
        this.sessionExpiresAt = 0;
        await this.ensureSession();
        return this.ensureUserPassword(username, email, password);
      }
      if (!res.ok) throw new Error(`RomM: update user failed ${res.status}`);
      return { existing: true };
    }
    const user = await this.createUser(username, email, password);
    return { existing: false, user };
  }

  async fetchAsset(path) {
    if (!path) return null;
    await this.ensureSession();
    const clean = path.startsWith('/') ? path : `/${path}`;
    const res = await this.request(clean);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      buffer: buf,
      contentType: res.headers.get('content-type') || 'image/png',
    };
  }

  async fetchRemoteImage(url) {
    try {
      const res = await fetchWithTimeout(url, {}, 10000);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return { buffer: buf, contentType: res.headers.get('content-type') || 'image/png' };
    } catch {
      return null;
    }
  }
}
