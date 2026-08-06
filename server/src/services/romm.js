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

    const res = await fetch(url.toString(), {
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

  async getRecentGames(limit = 12) {
    await this.ensureSession();
    const res = await this.request(
      `/api/roms?limit=${limit}&order_by=updated_at&order_dir=desc&with_files=false`,
    );
    if (res.status === 401) {
      this.sessionExpiresAt = 0;
      await this.ensureSession();
      return this.getRecentGames(limit);
    }
    if (!res.ok) throw new Error(`RomM: getRecentGames failed ${res.status}`);
    const data = await res.json();
    return (data.items || []).map((g) => ({
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
      genres: (g.metadatum?.genres || []).map((x) => x.name).slice(0, 3),
    }));
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
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return { buffer: buf, contentType: res.headers.get('content-type') || 'image/png' };
    } catch {
      return null;
    }
  }
}
