import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { getMyDevices, postNotifyDevice } from '../lib/api.js';
import { isOnesignalEnabled, getSubscriptionId, deviceLabel } from '../lib/onesignal.js';

// Auto-links the current browser's OneSignal subscription to the logged-in user,
// so devices that subscribed through OneSignal's own prompt (not just the bell)
// still show up in the owner messaging center.
export default function NotifySync() {
  const { user } = useAuth();
  const syncedFor = useRef(null);

  useEffect(() => {
    if (!user || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    let alive = true;
    (async () => {
      const ok = await isOnesignalEnabled();
      if (!ok) return;
      const subId = await getSubscriptionId({ retries: 8, delayMs: 400 });
      if (!alive || !subId) return;
      const mine = await getMyDevices().catch(() => ({ devices: [] }));
      if (!alive) return;
      const known = new Set((mine.devices || []).map((d) => d.playerId));
      if (known.has(subId)) return;
      await postNotifyDevice(subId, deviceLabel()).catch(() => {});
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  return null;
}
