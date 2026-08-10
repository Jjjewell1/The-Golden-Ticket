import { fetchWithTimeout } from './http.js';

export class Ntfy {
  constructor({ url = '', topic = '', auth = '' } = {}) {
    this.url = url;
    this.topic = topic;
    this.auth = auth;
  }

  get enabled() {
    return !!this.url && !!this.topic;
  }

  // Link members tap to subscribe in the ntfy app (topic name shown as "The Golden Ticket").
  get subscribeUrl() {
    if (!this.enabled) return null;
    const t = encodeURIComponent('The Golden Ticket');
    return `${this.url}/${encodeURIComponent(this.topic)}?t=${t}`;
  }

  async notify({ title, message, tags = [], click = null, priority = null }) {
    if (!this.enabled) {
      console.warn('ntfy: not configured, skipping notification');
      return false;
    }
    const body = {
      topic: this.topic,
      title,
      message,
      tags,
      ...(click ? { click } : {}),
      ...(priority != null ? { priority } : {}),
    };
    const headers = { 'Content-Type': 'application/json' };
    if (this.auth) headers.Authorization = `Basic ${Buffer.from(this.auth).toString('base64')}`;
    try {
      const res = await fetchWithTimeout(
        `${this.url}/${encodeURIComponent(this.topic)}`,
        { method: 'POST', headers, body: JSON.stringify(body) },
        8000,
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('ntfy: send failed', res.status, text.slice(0, 200));
        return false;
      }
      return true;
    } catch (err) {
      console.error('ntfy: send failed:', err.message);
      return false;
    }
  }
}
