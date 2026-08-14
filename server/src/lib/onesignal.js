import { fetchWithTimeout } from './http.js';

const API_URL = 'https://api.onesignal.com/notifications';

export class OneSignal {
  constructor({ appId = '', restApiKey = '' } = {}) {
    this.appId = appId;
    this.restApiKey = restApiKey;
  }

  get enabled() {
    return !!this.appId && !!this.restApiKey;
  }

  // Sends a push to the given web subscriptions (from OneSignal.User.getSubscriptionId()).
  // Returns { ok, id, recipients } — recipients is the count OneSignal reported (falling back
  // to the number of subscription IDs we sent).
  async notify({ headings, contents, url = null, webImage = null, subscriptionIds = [] }) {
    if (!this.enabled) {
      console.warn('onesignal: not configured, skipping notification');
      return { ok: false, id: null, recipients: 0 };
    }
    const ids = (subscriptionIds || []).filter(Boolean);
    if (ids.length === 0) {
      console.warn('onesignal: no subscriptions registered, skipping notification');
      return { ok: false, id: null, recipients: 0 };
    }
    const body = {
      app_id: this.appId,
      target_channel: 'push',
      include_subscription_ids: ids,
      headings: { en: headings },
      contents: { en: contents },
      ...(url ? { url } : {}),
      ...(webImage ? { chrome_web_image: webImage } : {}),
    };
    try {
      const res = await fetchWithTimeout(
        API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${this.restApiKey}`,
          },
          body: JSON.stringify(body),
        },
        8000,
      );
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        console.error('onesignal: send failed', res.status, text.slice(0, 300));
        return { ok: false, id: null, recipients: 0 };
      }
      const data = text ? JSON.parse(text) : {};
      if (!data.id) {
        console.error('onesignal: send accepted but no message created (no valid subscriptions?)', text.slice(0, 200));
        return { ok: false, id: null, recipients: 0 };
      }
      return { ok: true, id: data.id, recipients: data.recipients ?? ids.length };
    } catch (err) {
      console.error('onesignal: send failed:', err.message);
      return { ok: false, id: null, recipients: 0 };
    }
  }

  // Live reach stats from the OneSignal app object (players, messageable players,
  // whether the web channel is configured).
  async stats() {
    if (!this.enabled) return null;
    try {
      const res = await fetchWithTimeout(
        `https://api.onesignal.com/api/v1/apps/${this.appId}`,
        { headers: { Authorization: `Key ${this.restApiKey}` } },
        8000,
      );
      if (!res.ok) return null;
      const data = await res.json();
      return {
        players: data.players ?? 0,
        messageablePlayers: data.messageable_players ?? 0,
        channelConfigured: !!data.chrome_web_origin,
      };
    } catch (err) {
      console.error('onesignal: stats failed:', err.message);
      return null;
    }
  }
}
