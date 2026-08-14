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
  async notify({ headings, contents, url = null, subscriptionIds = [] }) {
    if (!this.enabled) {
      console.warn('onesignal: not configured, skipping notification');
      return false;
    }
    const ids = (subscriptionIds || []).filter(Boolean);
    if (ids.length === 0) {
      console.warn('onesignal: no subscriptions registered, skipping notification');
      return false;
    }
    const body = {
      app_id: this.appId,
      target_channel: 'push',
      include_subscription_ids: ids,
      headings: { en: headings },
      contents: { en: contents },
      ...(url ? { url } : {}),
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
        return false;
      }
      const data = text ? JSON.parse(text) : {};
      if (!data.id) {
        console.error('onesignal: send accepted but no message created (no valid subscriptions?)', text.slice(0, 200));
        return false;
      }
      return true;
    } catch (err) {
      console.error('onesignal: send failed:', err.message);
      return false;
    }
  }
}
