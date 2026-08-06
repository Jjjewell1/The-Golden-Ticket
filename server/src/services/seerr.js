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

  async getStatus() {
    const data = await this.request('/api/v1/status');
    return {
      version: data.version,
      appTitle: data.appName || 'Seerr',
      url: this.url,
    };
  }
}
