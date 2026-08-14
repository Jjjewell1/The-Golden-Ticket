import { getConfig } from './api.js';

let enabledPromise = null;

export function isOnesignalEnabled() {
  if (!enabledPromise) {
    enabledPromise = getConfig()
      .then((c) => c?.notify?.provider === 'onesignal')
      .catch(() => false);
  }
  return enabledPromise;
}

export function getAppId() {
  return getConfig().then((c) => (c?.notify?.provider === 'onesignal' ? c.notify.appId : null));
}

// OneSignal SDK (v16) is loaded via the <head> snippet in index.html.
function sdk() {
  return window.OneSignal;
}

export async function permissionState() {
  const os = sdk();
  if (!os) return 'unsupported';
  try {
    const p = await os.Notifications.getPermission();
    return p; // 'default' | 'granted' | 'denied'
  } catch {
    return 'unsupported';
  }
}

export function deviceLabel() {
  const ua = navigator.userAgent || '';
  return 'The Golden Ticket on ' + (ua.match(/Android|iPhone|iPad|Macintosh|Windows/i)?.[0] || 'browser');
}

// The subscription ID can lag a moment after permission is granted, so callers
// can ask for a few retries. Returns null if it never appears.
export async function getSubscriptionId({ retries = 0, delayMs = 400 } = {}) {
  const os = sdk();
  if (!os) return null;
  for (let i = 0; i <= retries; i++) {
    try {
      const id = (await os.User.getSubscriptionId()) || null;
      if (id) return id;
    } catch {
      // keep waiting below
    }
    if (i < retries) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export async function isSubscribed() {
  const os = sdk();
  if (!os) return false;
  try {
    const sub = await os.User.getSubscription();
    return !!sub && sub.optIn === true;
  } catch {
    return false;
  }
}

// Returns 'granted' | 'denied' | 'dismissed'.
export async function requestPermission() {
  const os = sdk();
  if (!os) return 'dismissed';
  try {
    return await os.Notifications.requestPermission(true);
  } catch {
    return 'dismissed';
  }
}

export async function setSubscriptionEnabled(optIn) {
  const os = sdk();
  if (!os) return;
  try {
    await os.User.setSubscription(optIn);
  } catch {
    // non-fatal — the server-side device record is what really matters
  }
}
