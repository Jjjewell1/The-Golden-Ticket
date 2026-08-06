export class Pushover {
  constructor({ token, user }) {
    this.token = token;
    this.user = user;
  }

  get enabled() {
    return !!this.token && !!this.user;
  }

  async notify({ title, message, url, urlTitle }) {
    if (!this.enabled) {
      console.warn('Pushover: not configured, skipping notification');
      return false;
    }
    const body = new URLSearchParams({
      token: this.token,
      user: this.user,
      title,
      message,
      priority: '1',
    });
    if (url) body.set('url', url);
    if (urlTitle) body.set('url_title', urlTitle);
    try {
      const res = await fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Pushover: send failed', res.status, text.slice(0, 200));
        return false;
      }
      return true;
    } catch (err) {
      console.error('Pushover: send failed:', err.message);
      return false;
    }
  }
}
