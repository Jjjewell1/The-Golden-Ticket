import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { getMyDevices, postNotifyDevice, deleteNotifyDevice } from '../lib/api.js';
import { isOnesignalEnabled, getSubscriptionId, isSubscribed, requestPermission, setSubscriptionEnabled } from '../lib/onesignal.js';
import { needsInstall, showInstallHint, isIos } from '../lib/install.js';

const LABEL_UA =
  'The Golden Ticket on ' +
  (navigator.userAgent?.match(/Android|iPhone|iPad|Macintosh|Windows/i)?.[0] || 'browser');

export default function NotifyBell() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await isOnesignalEnabled();
      if (!alive) return;
      if (!ok) {
        setLoading(false);
        return;
      }
      setEnabled(true);
      const [optIn, subId, mine] = await Promise.all([
        isSubscribed().catch(() => false),
        getSubscriptionId(),
        user ? getMyDevices().catch(() => ({ devices: [] })) : { devices: [] },
      ]);
      if (!alive) return;
      const mineIds = new Set((mine.devices || []).map((d) => d.playerId));
      setSubscribed(optIn && !!subId && mineIds.has(subId));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!enabled) return null;

  const registerDevice = async () => {
    const subId = await getSubscriptionId();
    if (!subId) throw new Error('Could not find your notification ID.');
    if (user) {
      const { ok, data } = await postNotifyDevice(subId, LABEL_UA);
      if (!ok) throw new Error(data.error || 'Could not save your subscription.');
    }
    setSubscribed(true);
  };

  const subscribe = async () => {
    setBusy(true);
    setError('');
    try {
      if (isIos() && needsInstall()) {
        // iPhone/iPad that isn't installed yet — guide them instead of a dead prompt.
        showInstallHint();
        return;
      }
      const result = await requestPermission();
      if (result !== 'granted') {
        setError(
          result === 'denied'
            ? 'Notifications are blocked in this browser. Allow them in your site settings, then try again.'
            : 'No problem — you can subscribe anytime from this card.',
        );
        return;
      }
      await registerDevice();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setError('');
    try {
      const subId = await getSubscriptionId();
      if (subId) {
        await deleteNotifyDevice(subId).catch(() => {});
      }
      await setSubscriptionEnabled(false);
      setSubscribed(false);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notify-card">
      <div className="notify-card-icon" aria-hidden="true">
        {subscribed ? '✅' : '🔔'}
      </div>
      <div className="notify-card-body">
        <h3>{subscribed ? "You're all set!" : 'Get a ping when something new lands'}</h3>
        <p>
          {subscribed
            ? 'We\u2019ll ping you whenever new movies, shows, or games hit the library — plus announcements from the family.'
            : 'Tap the bell to allow notifications and you\u2019ll be the first to know when new movies, shows, or games land.'}
        </p>
        {error && <div className="banner banner-error">{error}</div>}
      </div>
      {subscribed ? (
        <button className="btn btn-ghost" onClick={unsubscribe} disabled={busy}>
          {busy ? 'Turning off…' : 'Turn off'}
        </button>
      ) : (
        <button className="btn btn-gold" onClick={subscribe} disabled={busy || loading}>
          {busy ? 'Working…' : loading ? '…' : 'Notify me'}
        </button>
      )}
    </div>
  );
}
