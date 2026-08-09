import { fetchWithTimeout } from '../lib/http.js';

export class Linkwarden {
  constructor({ url, apiKey }) {
    this.url = url;
    this.apiKey = apiKey;
    this.pageSize = 50;
  }

  async request(path, query = {}) {
    const url = new URL(`${this.url}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
    const res = await fetchWithTimeout(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Linkwarden ${path} failed: ${res.status}`);
    return res;
  }

  mapLink(l) {
    const hasArchive = (value) => !!value && value !== 'unavailable';
    return {
      id: l.id,
      name: l.name || l.url || null,
      type: l.type || 'url',
      description: l.description || null,
      url: l.url || null,
      icon: l.icon || null,
      color: l.color || null,
      collection: l.collection
        ? { id: l.collection.id, name: l.collection.name, color: l.collection.color || '#0ea5e9' }
        : null,
      tags: (l.tags || []).map((t) => ({ id: t.id, name: t.name })),
      pinned: !!(l.pinnedBy && l.pinnedBy.length > 0),
      hasPreview: hasArchive(l.preview),
      createdAt: l.createdAt || null,
      updatedAt: l.updatedAt || null,
    };
  }

  // GET /api/v1/links returns { response: [...] } with no explicit nextCursor —
  // you pass the last link id as `cursor` to page. Search returns
  // { data: { links, nextCursor } }.
  async getLinks({ cursor, searchQueryString } = {}) {
    const res = await this.request('/api/v1/links', {
      sort: 0,
      cursor,
      searchQueryString,
    });
    const body = await res.json();
    const list = Array.isArray(body.response) ? body.response : [];
    const nextCursor = list.length === this.pageSize ? list[list.length - 1].id : null;
    return {
      items: list.map((l) => this.mapLink(l)),
      nextCursor,
    };
  }

  async searchLinks(q, { cursor } = {}) {
    const res = await this.request('/api/v1/search', {
      searchQueryString: q,
      cursor,
      sort: 0,
    });
    const body = await res.json();
    const data = body.data || {};
    const list = Array.isArray(data.links) ? data.links : [];
    return {
      items: list.map((l) => this.mapLink(l)),
      nextCursor: data.nextCursor || null,
    };
  }

  async getAllLinks() {
    const all = [];
    let cursor;
    let guard = 0;
    do {
      const { items, nextCursor } = await this.getLinks({ cursor });
      all.push(...items);
      cursor = nextCursor;
      guard += 1;
      if (guard > 40 || items.length === 0) break;
    } while (cursor != null);
    return all;
  }

  async getRecentLinks(limit = 12) {
    const { items } = await this.getLinks({});
    return items.slice(0, limit);
  }

  async getStatus() {
    const res = await this.request('/api/v1/links', {});
    await res.json();
    return { url: this.url };
  }

  // Proxy a preserved-format archive image (e.g. screenshot preview) so the
  // API token never reaches the browser.
  async fetchArchive(id, { preview = true, updatedAt } = {}) {
    const res = await this.request(`/api/v1/archives/${encodeURIComponent(id)}`, {
      format: 1, // ArchivedFormat.jpeg
      preview: preview ? 'true' : undefined,
      updatedAt,
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      buffer: buf,
      contentType: res.headers.get('content-type') || 'image/jpeg',
    };
  }
}
